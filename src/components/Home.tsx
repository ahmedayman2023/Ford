import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Wrench, 
  Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Part } from '../types';

interface HomeProps {
  loading: boolean;
  filteredParts: Part[];
  categories: string[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addToCart: (part: Part) => void;
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default function Home({
  loading,
  filteredParts,
  categories,
  activeCategory,
  setActiveCategory,
  searchQuery,
  setSearchQuery,
  addToCart
}: HomeProps) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <section className="relative rounded-[2rem] overflow-hidden mb-16 bg-ford-blue text-white shadow-2xl">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1551816230-ef5deaed4a26?auto=format&fit=crop&q=80&w=1920" 
            alt="Ford Hero" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ford-blue via-ford-blue/60 to-transparent" />
        </div>
        <div className="relative p-10 md:p-20 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
              توكيلات الجزيرة للسيارات
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
              قطع غيار فورد الأصلية <br />
              <span className="text-blue-300">بأفضل الأسعار</span>
            </h1>
            <p className="text-xl text-blue-100 mb-10 font-medium leading-relaxed">
              نحن نوفر لك جميع قطع الغيار الأصلية والمعتمدة لسيارتك فورد، مع ضمان الجودة وخدمة التوصيل السريع لجميع أنحاء المملكة.
            </p>
            <div className="flex flex-wrap gap-6">
              <button className="bg-white text-ford-blue px-10 py-4 rounded-full font-bold hover:bg-blue-50 transition-all flex items-center gap-3 shadow-xl active:scale-95">
                تسوق الآن <ArrowRight size={20} />
              </button>
              <button className="bg-transparent border-2 border-white/40 px-10 py-4 rounded-full font-bold hover:bg-white/10 transition-all active:scale-95">
                تصفح العروض
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6"
        >
          <div className="w-16 h-16 bg-blue-50 text-ford-blue rounded-2xl flex items-center justify-center">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg">قطع أصلية 100%</h3>
            <p className="text-sm text-gray-500 font-medium">ضمان الجودة من المصنع مباشرة.</p>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6"
        >
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
            <Truck size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg">توصيل سريع</h3>
            <p className="text-sm text-gray-500 font-medium">شحن آمن وسريع لباب منزلك.</p>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6"
        >
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center">
            <Wrench size={32} />
          </div>
          <div>
            <h3 className="font-bold text-lg">دعم فني متخصص</h3>
            <p className="text-sm text-gray-500 font-medium">خبراء فورد في خدمتك دائماً.</p>
          </div>
        </motion.div>
      </div>

      {/* Catalog Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
        <div>
          <h2 className="text-3xl font-black text-ford-blue mb-3">كتالوج قطع الغيار</h2>
          <p className="text-gray-500 font-medium">اختر من بين آلاف القطع المتوفرة في مخازننا.</p>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                activeCategory === cat 
                  ? "bg-ford-blue text-white shadow-lg shadow-ford-blue/20" 
                  : "bg-white text-gray-500 border border-gray-200 hover:border-ford-blue hover:text-ford-blue"
              )}
            >
              {cat === 'All' ? 'الكل' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl h-96 animate-pulse border border-gray-100" />
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredParts.map(part => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={part.id || part._id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 group border border-gray-100"
              >
                <Link to={`/product/${part.id || part._id}`} className="block">
                  <div className="aspect-[4/3] relative overflow-hidden bg-gray-50">
                    <img 
                      src={part.images?.[0] || 'https://via.placeholder.com/400x300'} 
                      alt={part.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-white/90 backdrop-blur-md text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest text-ford-blue shadow-sm">
                        {part.category}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="p-6">
                  <Link to={`/product/${part.id || part._id}`} className="block">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-ford-blue transition-colors line-clamp-1">{part.name}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mb-4 font-medium line-clamp-1">{part.compatibility.join(', ')}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-400 font-bold">السعر</span>
                      <span className="text-2xl font-black text-ford-blue">${part.price.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(part)}
                      className="bg-ford-gray text-ford-blue hover:bg-ford-blue hover:text-white p-3 rounded-2xl transition-all shadow-sm active:scale-90"
                    >
                      <Plus size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {filteredParts.length === 0 && !loading && (
        <div className="text-center py-20">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Search size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-600">لم يتم العثور على نتائج</h3>
          <p className="text-gray-400">جرب البحث بكلمات مختلفة أو تغيير التصنيف.</p>
        </div>
      )}
    </main>
  );
}
