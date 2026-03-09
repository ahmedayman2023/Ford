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
    image: 'https://picsum.photos/seed/newpart/400/300',
    description: '',
    compatibility: [],
    stock: 10
  });

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
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPart)
      });
      if (response.ok) {
        const added = await response.json();
        setParts(prev => [...prev, added]);
        setIsAdminOpen(false);
        setNewPart({
          name: '',
          category: 'Engine',
          price: 0,
          image: 'https://picsum.photos/seed/newpart/400/300',
          description: '',
          compatibility: [],
          stock: 10
        });
      }
    } catch (error) {
      console.error("Error adding part:", error);
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

  const categories = ['All', 'Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Transmission'];

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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A] dir-rtl" dir="rtl">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-black/5 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#003478] rounded-lg flex items-center justify-center text-white">
                  <Wrench size={24} />
                </div>
                <span className="text-xl font-bold tracking-tight text-[#003478]">فورد<span className="text-black">بارتس</span> برو</span>
              </div>
              
              <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
                <a href="#" className="hover:text-[#003478] transition-colors">الرئيسية</a>
                <a href="#" className="hover:text-[#003478] transition-colors">الكتالوج</a>
                <a href="#" className="hover:text-[#003478] transition-colors">تتبع الطلب</a>
                <a href="#" className="hover:text-[#003478] transition-colors">تواصل معنا</a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold">
                <div className={cn("w-2 h-2 rounded-full", dbStatus.connected ? "bg-green-500" : "bg-red-500")} />
                <span className="text-gray-500 uppercase">{dbStatus.connected ? "قاعدة البيانات متصلة" : "قاعدة البيانات غير متصلة"}</span>
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
                  placeholder="ابحث عن قطعة أو موديل..."
                  className="bg-gray-100 border-none rounded-full py-2 pr-10 pl-4 text-sm w-64 focus:ring-2 focus:ring-[#003478] transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ShoppingCart size={22} />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-[#003478] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </button>
              
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-full">
                <Menu size={22} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="relative rounded-3xl overflow-hidden mb-12 bg-[#003478] text-white">
          <div className="absolute inset-0 opacity-20">
            <img 
              src="https://picsum.photos/seed/ford-hero/1200/400" 
              alt="Ford Background" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="relative p-8 md:p-16 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">قطع غيار فورد الأصلية، بلمسة زر واحدة.</h1>
            <p className="text-lg text-blue-100 mb-8">نقدم لك أفضل قطع الغيار المعتمدة لجميع موديلات فورد، مع ضمان الجودة وسرعة التوصيل.</p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-[#003478] px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition-colors flex items-center gap-2">
                تسوق الآن <ArrowRight size={18} />
              </button>
              <button className="bg-transparent border border-white/30 px-8 py-3 rounded-full font-bold hover:bg-white/10 transition-colors">
                تصفح العروض
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-[#003478] rounded-xl flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="font-bold">قطع أصلية 100%</h3>
              <p className="text-sm text-gray-500">نضمن لك الجودة والموثوقية.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
              <Truck size={28} />
            </div>
            <div>
              <h3 className="font-bold">توصيل سريع</h3>
              <p className="text-sm text-gray-500">شحن لجميع مناطق المملكة.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
              <Wrench size={28} />
            </div>
            <div>
              <h3 className="font-bold">دعم فني متخصص</h3>
              <p className="text-sm text-gray-500">خبراء لمساعدتك في الاختيار.</p>
            </div>
          </div>
        </div>

        {/* Catalog Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold mb-2">كتالوج قطع الغيار</h2>
            <p className="text-gray-500">تصفح مجموعتنا الواسعة من القطع المختارة.</p>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  activeCategory === cat 
                    ? "bg-[#003478] text-white shadow-md" 
                    : "bg-white text-gray-600 hover:bg-gray-100"
                )}
              >
                {cat === 'All' ? 'الكل' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Parts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-black/5" />
            ))
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredParts.map(part => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={part.id || part._id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group border border-black/5"
                >
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                    <img 
                      src={part.image} 
                      alt={part.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        {part.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-[#003478] transition-colors">{part.name}</h3>
                    <p className="text-xs text-gray-400 mb-3 line-clamp-1">{part.compatibility.join(', ')}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-[#003478]">${part.price.toFixed(2)}</span>
                      <button 
                        onClick={() => addToCart(part)}
                        className="bg-gray-100 hover:bg-[#003478] hover:text-white p-2 rounded-xl transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {filteredParts.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-600">لم يتم العثور على نتائج</h3>
            <p className="text-gray-400">جرب البحث بكلمات مختلفة أو تغيير التصنيف.</p>
          </div>
        )}
      </main>

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
                  <ShoppingCart className="text-[#003478]" />
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
                      className="mt-4 text-[#003478] font-bold hover:underline"
                    >
                      ابدأ التسوق الآن
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                  <button className="w-full bg-[#003478] text-white py-4 rounded-2xl font-bold hover:bg-blue-900 transition-colors shadow-lg shadow-blue-900/20">
                    إتمام الشراء
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
              <div className="p-6 border-b flex items-center justify-between bg-[#003478] text-white">
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
                      value={newPart.name}
                      onChange={e => setNewPart({...newPart, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">التصنيف</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
                      value={newPart.price}
                      onChange={e => setNewPart({...newPart, price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">الكمية في المخزن</label>
                    <input 
                      required
                      type="number" 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm"
                    onChange={e => setNewPart({...newPart, compatibility: e.target.value.split(',').map(s => s.trim())})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">الوصف</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm h-24"
                    value={newPart.description}
                    onChange={e => setNewPart({...newPart, description: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-[#003478] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors"
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#003478] text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform z-40"
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
            <div className="p-4 bg-[#003478] text-white flex items-center justify-between">
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
                      ? "bg-[#003478] text-white rounded-tr-none" 
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
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-[#003478]"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!chatInput.trim() || isTyping}
                  className="bg-[#003478] text-white p-2 rounded-xl disabled:opacity-50 hover:bg-blue-900 transition-colors"
                >
                  <Send size={20} className="rotate-180" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-[#003478] rounded-lg flex items-center justify-center text-white">
                  <Wrench size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight text-[#003478]">فورد<span className="text-black">بارتس</span> برو</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                وجهتك الأولى والموثوقة لجميع قطع غيار سيارات فورد الأصلية في المنطقة. نلتزم بتوفير أفضل جودة وأسرع خدمة.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-6">روابط سريعة</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#003478]">عن المتجر</a></li>
                <li><a href="#" className="hover:text-[#003478]">سياسة الاسترجاع</a></li>
                <li><a href="#" className="hover:text-[#003478]">الشحن والتوصيل</a></li>
                <li><a href="#" className="hover:text-[#003478]">الأسئلة الشائعة</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">التصنيفات</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-[#003478]">المحرك</a></li>
                <li><a href="#" className="hover:text-[#003478]">الفرامل</a></li>
                <li><a href="#" className="hover:text-[#003478]">الكهرباء</a></li>
                <li><a href="#" className="hover:text-[#003478]">الهيكل</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">اشترك في النشرة البريدية</h4>
              <p className="text-sm text-gray-500 mb-4">احصل على آخر العروض والخصومات الحصرية.</p>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="بريدك الإلكتروني"
                  className="bg-gray-100 border-none rounded-xl px-4 py-2 text-sm flex-1"
                />
                <button className="bg-[#003478] text-white px-4 py-2 rounded-xl text-sm font-bold">
                  اشترك
                </button>
              </div>
            </div>
          </div>
          
          <div className="border-t border-black/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">© 2024 فورد بارتس برو. جميع الحقوق محفوظة.</p>
            <div className="flex gap-6">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 opacity-50" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 opacity-50" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 opacity-50" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
