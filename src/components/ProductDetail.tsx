import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  Wrench, 
  Plus, 
  Minus,
  CheckCircle2
} from 'lucide-react';
import { Part } from '../types';
import { FORD_PARTS } from '../constants';

interface ProductDetailProps {
  addToCart: (part: Part) => void;
}

export default function ProductDetail({ addToCart }: ProductDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) throw new Error("Product not found");
        const data = await response.json();
        setPart(data);
      } catch (error) {
        console.error("Error fetching product:", error);
        // Fallback to constants
        const fallback = FORD_PARTS.find(p => p.id === id);
        setPart(fallback || null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-ford-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">المنتج غير موجود</h2>
        <Link to="/" className="text-ford-blue hover:underline">العودة للرئيسية</Link>
      </div>
    );
  }

  const images = part.images && part.images.length > 0 ? part.images : ['https://via.placeholder.com/600x600'];

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(part);
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
    >
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-ford-blue mb-8 transition-colors font-bold">
        <ArrowLeft size={20} className="rotate-180" />
        <span>العودة للكتالوج</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Image Section */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-gray-100 aspect-square group">
            <img 
              src={images[activeImage]} 
              alt={part.name} 
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {images.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-24 h-24 rounded-2xl overflow-hidden border-4 flex-shrink-0 transition-all ${
                    activeImage === i ? "border-ford-blue shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt={`${part.name} ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="flex flex-col">
          <div className="mb-8">
            <span className="bg-blue-50 text-ford-blue text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-6 inline-block shadow-sm">
              {part.category}
            </span>
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-ford-blue leading-tight">{part.name}</h1>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-3xl font-black text-ford-blue">${part.price.toFixed(2)}</span>
              <span className="text-sm text-gray-400 font-bold">شامل ضريبة القيمة المضافة</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 font-bold bg-green-50 w-fit px-4 py-2 rounded-full border border-green-100">
              <CheckCircle2 size={18} />
              <span>متوفر في المخزن ({part.stock} قطعة)</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-10">
            <h3 className="font-black text-ford-blue mb-4 text-lg">الوصف</h3>
            <p className="text-gray-600 leading-relaxed mb-8 font-medium">{part.description}</p>
            
            <h3 className="font-black text-ford-blue mb-4 text-lg">التوافق</h3>
            <div className="flex flex-wrap gap-3">
              {part.compatibility.map((c, i) => (
                <span key={i} className="bg-ford-gray text-ford-blue px-4 py-2 rounded-xl text-sm font-bold border border-gray-100">
                  {c}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-6 bg-ford-gray rounded-2xl px-6 py-3 border border-gray-100">
                <button 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-1 hover:bg-white rounded-lg transition-all text-ford-blue active:scale-90"
                >
                  <Minus size={24} />
                </button>
                <span className="text-xl font-black w-8 text-center text-ford-blue">{quantity}</span>
                <button 
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-1 hover:bg-white rounded-lg transition-all text-ford-blue active:scale-90"
                >
                  <Plus size={24} />
                </button>
              </div>
              
              <button 
                onClick={handleAddToCart}
                disabled={added}
                className={`flex-1 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                  added 
                    ? "bg-green-500 text-white shadow-green-500/20" 
                    : "bg-ford-blue text-white hover:bg-ford-dark shadow-ford-blue/20"
                }`}
              >
                {added ? (
                  <>تمت الإضافة <CheckCircle2 size={24} /></>
                ) : (
                  <>أضف للسلة <ShoppingCart size={24} /></>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-100">
              <div className="text-center group">
                <div className="w-12 h-12 bg-ford-gray rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:bg-ford-blue group-hover:text-white transition-all">
                  <ShieldCheck size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ضمان أصلي</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-ford-gray rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:bg-ford-blue group-hover:text-white transition-all">
                  <Truck size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">توصيل سريع</p>
              </div>
              <div className="text-center group">
                <div className="w-12 h-12 bg-ford-gray rounded-2xl flex items-center justify-center mx-auto mb-2 group-hover:bg-ford-blue group-hover:text-white transition-all">
                  <Wrench size={24} />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">دعم فني</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
