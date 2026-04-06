/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Menu, 
  X, 
  ChevronRight, 
  Filter, 
  Wrench, 
  ShieldCheck, 
  Truck, 
  MessageSquare,
  Send,
  Trash2,
  Plus,
  Minus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import Home from './components/Home';
import ProductDetail from './components/ProductDetail';
import { Part, CartItem, ChatMessage } from './types';
import { FORD_PARTS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; uri: string }>({ connected: false, uri: 'Unknown' });
  const [newPart, setNewPart] = useState<Partial<Part>>({
    name: '',
    category: 'Engine',
    price: 0,
    images: [],
    description: '',
    compatibility: [],
    stock: 10
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setPreviews([]);
      return;
    }
    const newPreviews = selectedFiles.slice(0, 3).map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
    
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch('/api/db-status');
        const data = await res.json();
        setDbStatus(data);
      } catch (e) {
        console.error(e);
      }
    };
    checkDb();
  }, []);

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newPart.name || '');
      formData.append('category', newPart.category || '');
      formData.append('price', (newPart.price || 0).toString());
      formData.append('description', newPart.description || '');
      formData.append('stock', (newPart.stock || 0).toString());
      formData.append('compatibility', JSON.stringify(newPart.compatibility || []));
      
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const added = await response.json();
        setParts(prev => [...prev, added]);
        setIsAdminOpen(false);
        setNewPart({
          name: '',
          category: 'Engine',
          price: 0,
          images: [],
          description: '',
          compatibility: [],
          stock: 10
        });
        setSelectedFiles([]);
      }
    } catch (error) {
      console.error("Error adding part:", error);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });

      const session = await response.json();
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error(session.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('حدث خطأ أثناء إتمام عملية الدفع. يرجى المحاولة مرة أخرى.');
    } finally {
      setCheckoutLoading(false);
    }
  };
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: 'مرحباً! أنا مساعد فورد الذكي. كيف يمكنني مساعدتك في العثور على قطعة الغيار المناسبة لسيارتك اليوم؟' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        
        // Check if response is JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from server");
        }

        const data = await response.json();
        
        if (data.error) {
          console.warn("Server returned error:", data.error);
          setParts(FORD_PARTS);
        } else {
          setParts(data.length > 0 ? data : FORD_PARTS);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setParts(FORD_PARTS);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(parts.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [parts]);

  const filteredParts = useMemo(() => {
    return parts.filter(part => {
      const matchesCategory = activeCategory === 'All' || part.category === activeCategory;
      const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           part.compatibility.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, parts]);

  const addToCart = (part: Part) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === part.id);
      if (existing) {
        return prev.map(item => item.id === part.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...part, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'canceled' | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('success')) {
      setCheckoutStatus('success');
      setCart([]);
    }
    if (query.get('canceled')) {
      setCheckoutStatus('canceled');
    }
  }, []);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: 'user',
            parts: [{ text: `You are a Ford spare parts expert. Help the user find parts from our catalog. 
            Catalog: ${JSON.stringify(FORD_PARTS)}. 
            User says: ${userMsg}. 
            Respond in Arabic. Be helpful and professional.` }]
          }
        ],
      });

      setChatMessages(prev => [...prev, { role: 'model', content: response.text || 'عذراً، لم أستطع فهم ذلك.' }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'model', content: 'حدث خطأ أثناء الاتصال بالمساعد الذكي.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-ford-gray font-sans text-gray-900 dir-rtl" dir="rtl">
        {/* Navigation */}
        <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-12">
                <Link to="/" className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-ford-blue rounded-full flex items-center justify-center text-white shadow-lg">
                    <Wrench size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-black tracking-tighter text-ford-blue leading-none">FORD</span>
                    <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Parts Saudi</span>
                  </div>
                </Link>

                {/* Success/Cancel Messages */}
                <AnimatePresence>
                  {checkoutStatus && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className={cn(
                        "hidden lg:flex items-center gap-3 px-6 py-2 rounded-full shadow-lg font-bold text-sm",
                        checkoutStatus === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      )}
                    >
                      {checkoutStatus === 'success' ? (
                        <>
                          <ShieldCheck size={18} />
                          <span>تمت عملية الشراء بنجاح!</span>
                        </>
                      ) : (
                        <>
                          <X size={18} />
                          <span>تم إلغاء عملية الدفع.</span>
                        </>
                      )}
                      <button onClick={() => setCheckoutStatus(null)} className="ml-2 hover:bg-white/20 p-1 rounded-full">
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="hidden md:flex items-center gap-8 text-sm font-bold text-gray-600">
                  <Link to="/" className="hover:text-ford-blue transition-colors relative group">
                    الرئيسية
                    <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-ford-blue transition-all group-hover:w-full"></span>
                  </Link>
                  <a href="#" className="hover:text-ford-blue transition-colors relative group">
                    الموديلات
                    <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-ford-blue transition-all group-hover:w-full"></span>
                  </a>
                  <a href="#" className="hover:text-ford-blue transition-colors relative group">
                    العروض
                    <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-ford-blue transition-all group-hover:w-full"></span>
                  </a>
                  <a href="#" className="hover:text-ford-blue transition-colors relative group">
                    خدماتنا
                    <span className="absolute -bottom-1 right-0 w-0 h-0.5 bg-ford-blue transition-all group-hover:w-full"></span>
                  </a>
                </div>
              </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold">
                <div className={cn("w-2 h-2 rounded-full", dbStatus.connected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-gray-500 uppercase">{dbStatus.connected ? "متصل" : "غير متصل"}</span>
              </div>

              <button 
                onClick={() => setIsAdminOpen(true)}
                className="hidden sm:flex items-center gap-2 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                title="إضافة منتج"
              >
                <Plus size={22} />
              </button>

              <div className="relative hidden sm:block">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ابحث عن قطعة..."
                  className="bg-gray-50 border border-gray-200 rounded-full py-2 pr-10 pl-4 text-sm w-64 focus:ring-2 focus:ring-ford-blue focus:bg-white transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-ford-blue"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-full">
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

        <Routes>
          <Route path="/" element={
            <Home 
              loading={loading}
              filteredParts={filteredParts}
              categories={categories}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              addToCart={addToCart}
            />
          } />
          <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} />} />
        </Routes>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="text-ford-blue" />
                  <h2 className="text-xl font-bold">سلة التسوق</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                      <ShoppingCart size={48} />
                    </div>
                    <p className="text-gray-500">سلتك فارغة حالياً</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-ford-blue font-bold hover:underline"
                    >
                      ابدأ التسوق الآن
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.images?.[0] || 'https://via.placeholder.com/150'} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                        <p className="text-xs text-gray-400 mb-2">${item.price.toFixed(2)}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-2 py-1">
                            <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-500 hover:text-black"><Minus size={14} /></button>
                            <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-500 hover:text-black"><Plus size={14} /></button>
                          </div>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between mb-4">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span className="font-bold text-xl">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full bg-ford-blue text-white py-4 rounded-2xl font-bold hover:bg-ford-dark transition-colors shadow-lg shadow-ford-blue/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'إتمام الشراء'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin Add Part Modal */}
      <AnimatePresence>
        {isAdminOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit bg-white z-[60] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-ford-blue text-white">
                <h2 className="text-xl font-bold">إضافة قطعة غيار جديدة</h2>
                <button onClick={() => setIsAdminOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddPart} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">اسم القطعة</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all"
                      value={newPart.name}
                      onChange={e => setNewPart({...newPart, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">التصنيف</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all"
                      value={newPart.category}
                      onChange={e => setNewPart({...newPart, category: e.target.value as any})}
                    >
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">السعر ($)</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all"
                      value={newPart.price}
                      onChange={e => setNewPart({...newPart, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">الكمية في المخزن</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all"
                      value={newPart.stock}
                      onChange={e => setNewPart({...newPart, stock: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">التوافق (افصل بينها بفاصلة)</label>
                  <input 
                    type="text" 
                    placeholder="F-150 2020, Mustang 2021"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all"
                    onChange={e => setNewPart({...newPart, compatibility: e.target.value.split(',').map(s => s.trim())})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">الوصف</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm h-24 focus:ring-2 focus:ring-ford-blue transition-all"
                    value={newPart.description}
                    onChange={e => setNewPart({...newPart, description: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500">صور المنتج (3 أماكن للمعاينة)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="aspect-square bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden group relative">
                        {previews[i] ? (
                          <motion.img 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={previews[i]} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <Plus size={24} className="text-gray-300 group-hover:text-ford-blue transition-colors" />
                        )}
                        <div className="absolute inset-0 bg-ford-blue/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                  <input 
                    type="file" 
                    multiple
                    accept="image/*"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-ford-blue file:text-white hover:file:bg-ford-dark"
                    onChange={e => {
                      if (e.target.files) {
                        setSelectedFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  {selectedFiles.length > 0 && (
                    <p className="text-[10px] text-ford-blue font-bold">تم اختيار {selectedFiles.length} صور بنجاح</p>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full bg-ford-blue text-white py-3 rounded-xl font-bold hover:bg-ford-dark transition-colors shadow-lg shadow-ford-blue/20"
                >
                  حفظ في قاعدة البيانات
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant Button */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-ford-blue text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <MessageSquare size={28} />
      </button>

      {/* AI Chat Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[calc(100vw-3rem)] sm:w-96 h-[500px] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-black/5"
          >
            <div className="p-4 bg-ford-blue text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Wrench size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">مساعد فورد الذكي</h3>
                  <p className="text-[10px] text-blue-200">متصل الآن</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-start" : "justify-end"
                )}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-ford-blue text-white rounded-tr-none" 
                      : "bg-white border border-black/5 text-gray-800 rounded-tl-none shadow-sm"
                  )}>
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-end">
                  <div className="bg-white border border-black/5 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  placeholder="اسأل عن قطعة معينة..."
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-ford-blue"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isTyping}
                  className="bg-ford-blue text-white p-2 rounded-xl disabled:opacity-50 hover:bg-ford-dark transition-colors"
                >
                  <Send size={20} className="rotate-180" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-ford-blue rounded-full flex items-center justify-center text-white">
                  <Wrench size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tighter text-ford-blue leading-none">FORD</span>
                  <span className="text-[8px] font-bold text-gray-500 tracking-widest uppercase">Parts Saudi</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                توكيلات الجزيرة للسيارات - الوكيل الرسمي لفورد في المملكة العربية السعودية. نلتزم بتقديم أفضل تجربة لعملائنا من خلال توفير قطع الغيار الأصلية والخدمات المتميزة.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-ford-blue mb-6">موديلاتنا</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-ford-blue transition-colors">فورد توروس</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">فورد إكسبلورر</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">فورد إكسبيديشن</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">فورد F-150</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-ford-blue mb-6">خدمات ما بعد البيع</h4>
              <ul className="space-y-4 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-ford-blue transition-colors">حجز موعد صيانة</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">قطع الغيار الأصلية</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">برامج الصيانة</a></li>
                <li><a href="#" className="hover:text-ford-blue transition-colors">المساعدة على الطريق</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-ford-blue mb-6">تواصل معنا</h4>
              <p className="text-sm text-gray-600 mb-4 font-medium">اشترك للحصول على أحدث العروض والأخبار.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="البريد الإلكتروني"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm flex-1 focus:ring-2 focus:ring-ford-blue focus:bg-white outline-none"
                />
                <button className="bg-ford-blue text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-ford-dark transition-colors">
                  إرسال
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-gray-400 font-medium">© 2024 توكيلات الجزيرة للسيارات. جميع الحقوق محفوظة.</p>
            <div className="flex gap-8 items-center">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-5 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" />
            </div>
          </div>
        </div>
      </footer>
      </div>
    </BrowserRouter>
  );
}
