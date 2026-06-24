import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Package, X, Minus, Plus } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface ShopProps {
  accentColor: string;
  paypalClientId?: string;
}

export default function Shop({ accentColor, paypalClientId }: ShopProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [orderStatus, setOrderStatus] = useState<string>('');

  useEffect(() => {
    fetch('/api/shop/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => {});
  }, []);

  // Load PayPal SDK
  useEffect(() => {
    if (!paypalClientId) return;
    if (document.getElementById('paypal-sdk')) return;
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
    script.async = true;
    document.body.appendChild(script);
  }, [paypalClientId]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);

  const handleCheckout = async () => {
    if (!paypalClientId) {
      setOrderStatus('PayPal not configured yet — coming soon!');
      return;
    }

    const res = await fetch('/api/shop/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.map(i => ({ id: i.id, quantity: i.quantity })) }),
    });
    const data = await res.json();

    // Render PayPal buttons
    const container = document.getElementById('paypal-button-container');
    if (container) container.innerHTML = '';

    (window as any).paypal?.Buttons({
      createOrder: () => {
        return (window as any).paypal.orders.create({
          purchase_units: [{ amount: { value: data.total } }]
        });
      },
      onApprove: async (approveData: any) => {
        await fetch('/api/shop/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, paypalOrderId: approveData.orderID, payerEmail: '' }),
        });
        setOrderStatus('Order confirmed! 🚀');
        setCart([]);
        setShowCart(false);
      },
    }).render('#paypal-button-container');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Package size={20} style={{ color: accentColor }} />
            SpaceMountain Shop
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Merch, overlays, and digital goods</p>
        </div>
        <button
          onClick={() => setShowCart(!showCart)}
          className="relative px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white flex items-center gap-2 transition-all"
        >
          <ShoppingCart size={16} />
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-black" style={{ backgroundColor: accentColor }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'apparel', 'accessories', 'digital'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${filter === cat ? 'text-black' : 'text-zinc-400 border-white/10 bg-white/5 hover:bg-white/10'}`}
            style={filter === cat ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Cart overlay */}
      {showCart && (
        <div className="rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Your Cart</span>
            <button onClick={() => setShowCart(false)} className="text-zinc-400 hover:text-white"><X size={16} /></button>
          </div>
          {cart.length === 0 ? (
            <p className="text-xs text-zinc-500">Cart is empty</p>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                    <span className="text-[10px] text-zinc-400">${item.price.toFixed(2)} ea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"><Minus size={12} /></button>
                    <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white"><Plus size={12} /></button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-white">Total: ${cartTotal.toFixed(2)}</span>
                <button
                  onClick={handleCheckout}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-black transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: accentColor }}
                >
                  Checkout with PayPal
                </button>
              </div>
              <div id="paypal-button-container" className="mt-2"></div>
              {orderStatus && <p className="text-xs text-emerald-400 font-bold text-center mt-2">{orderStatus}</p>}
            </>
          )}
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map(product => (
          <motion.div
            key={product.id}
            whileHover={{ scale: 1.02, y: -2 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-3 cursor-pointer group"
          >
            <div className="w-full h-32 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center overflow-hidden">
              <img src={product.image} alt={product.name} className="max-h-full max-w-full object-contain p-3 opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500">{product.category}</span>
              <span className="text-sm font-bold text-white">{product.name}</span>
              <span className="text-[11px] text-zinc-400 leading-relaxed">{product.description}</span>
            </div>
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
              <span className="text-sm font-bold" style={{ color: accentColor }}>${product.price.toFixed(2)}</span>
              <button
                onClick={() => addToCart(product)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:bg-white/10"
                style={{ borderColor: `${accentColor}40`, color: accentColor }}
              >
                Add to Cart
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
