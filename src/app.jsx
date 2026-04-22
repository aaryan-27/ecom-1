/* Pop Culture — single-file React app.
 * Uses React 18 UMD + React Router 6 UMD + Tailwind CDN, transpiled in-browser
 * with Babel Standalone. No build step. */

const { useState, useEffect, useMemo, useRef, useContext, createContext } = React;

/* ---------- Tiny hash router (replaces react-router-dom) ---------- */
const RouterCtx = createContext(null);

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, searchRaw = ""] = raw.split("?");
  return { pathname: path || "/", search: searchRaw ? "?" + searchRaw : "" };
}

function HashRouter({ children }) {
  const [loc, setLoc] = useState(parseHash());
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "#/";
    const onChange = () => setLoc(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (to, opts = {}) => {
    const target = "#" + (to.startsWith("/") ? to : "/" + to);
    if (opts.replace) {
      const url = window.location.href.split("#")[0] + target;
      window.history.replaceState(null, "", url);
      setLoc(parseHash());
    } else {
      window.location.hash = target;
    }
  };

  return (
    <RouterCtx.Provider value={{ loc, navigate }}>
      {children}
    </RouterCtx.Provider>
  );
}

const useLocation = () => useContext(RouterCtx).loc;
const useNavigate = () => useContext(RouterCtx).navigate;

function matchRoute(pattern, pathname) {
  if (pattern === "*") return { params: {} };
  const pKeys = [];
  const regex = new RegExp(
    "^" +
      pattern.replace(/:[^/]+/g, (m) => {
        pKeys.push(m.slice(1));
        return "([^/]+)";
      }) +
      "$"
  );
  const m = pathname.match(regex);
  if (!m) return null;
  const params = {};
  pKeys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
  return { params };
}

const ParamsCtx = createContext({});
const useParams = () => useContext(ParamsCtx);

function Routes({ children }) {
  const { loc } = useContext(RouterCtx);
  const childArr = React.Children.toArray(children);
  for (const child of childArr) {
    const { path, element } = child.props;
    const matched = matchRoute(path, loc.pathname);
    if (matched) {
      return <ParamsCtx.Provider value={matched.params}>{element}</ParamsCtx.Provider>;
    }
  }
  // fallback to * route if present
  const star = childArr.find((c) => c.props.path === "*");
  return star ? star.props.element : null;
}

const Route = () => null;

function Link({ to, children, className, onClick, ...rest }) {
  const { navigate } = useContext(RouterCtx);
  const handle = (e) => {
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };
  return (
    <a href={"#" + (to.startsWith("/") ? to : "/" + to)} onClick={handle} className={className} {...rest}>
      {children}
    </a>
  );
}

function NavLink({ to, children, className, end, onClick, ...rest }) {
  const { loc, navigate } = useContext(RouterCtx);
  const toPath = to.split("?")[0];
  const active = end ? loc.pathname === toPath : loc.pathname === toPath || loc.pathname.startsWith(toPath + "/");
  const cls = typeof className === "function" ? className({ isActive: active }) : className;
  const handle = (e) => {
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to);
  };
  return (
    <a href={"#" + (to.startsWith("/") ? to : "/" + to)} onClick={handle} className={cls} {...rest}>
      {children}
    </a>
  );
}

const DATA = window.__POPCULTURE_DATA__;
const PRODUCTS = DATA.products;
const COLLECTIONS = DATA.collections;
const TESTIMONIALS = DATA.testimonials;

const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");

/* ---------- Cart Context ---------- */
const CartCtx = createContext(null);
const useCart = () => useContext(CartCtx);

function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pc_cart") || "[]"); } catch { return []; }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("pc_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (product, size, qty = 1) => {
    setItems((prev) => {
      const key = product.id + "::" + size;
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i));
      return [
        ...prev,
        {
          key, id: product.id, slug: product.slug, name: product.name,
          price: product.price, image: product.images[0], size, qty,
        },
      ];
    });
    setDrawerOpen(true);
  };
  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const updateQty = (key, qty) =>
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, qty: Math.max(1, qty) } : i))
    );
  const clear = () => setItems([]);
  const count = items.reduce((a, b) => a + b.qty, 0);
  const subtotal = items.reduce((a, b) => a + b.qty * b.price, 0);

  return (
    <CartCtx.Provider
      value={{ items, addItem, removeItem, updateQty, clear, count, subtotal, drawerOpen, setDrawerOpen }}
    >
      {children}
    </CartCtx.Provider>
  );
}

/* ---------- Icons ---------- */
const Icon = {
  Cart: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>
    </svg>
  ),
  Menu: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
  ),
  Close: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
  ),
  Star: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1z"/></svg>
  ),
  Arrow: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
  ),
  Search: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
  ),
  User: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  ),
  Heart: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1 7.8 7.8 7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
  ),
  Check: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
  ),
  Truck: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  ),
  Return: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
  ),
  Shield: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  ),
};

const Stars = ({ value = 5, size = "w-4 h-4" }) => (
  <div className="flex items-center gap-0.5 text-amber-500">
    {[1,2,3,4,5].map((i) => (
      <Icon.Star key={i} className={size + (i <= Math.round(value) ? "" : " text-neutral-300")} />
    ))}
  </div>
);

/* ---------- Layout: Header / Footer / Announcement ---------- */
function AnnouncementBar() {
  const items = [
    "FREE SHIPPING ON ORDERS OVER ₹1499",
    "EASY 7-DAY RETURNS",
    "NEW DROPS EVERY FRIDAY",
    "SHIPPED FROM GURUGRAM",
    "COD AVAILABLE",
  ];
  const track = [...items, ...items, ...items];
  return (
    <div className="bg-ink text-cream py-2 overflow-hidden border-b border-ink">
      <div className="marquee">
        <div className="marquee-track gap-10 px-10 text-xs tracking-widest font-medium uppercase">
          {track.map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              <span>{t}</span>
              <span className="text-acid">★</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  const { count, setDrawerOpen } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  const navLink = ({ isActive }) =>
    "text-sm font-semibold tracking-wide uppercase hover:text-hot transition " +
    (isActive ? "text-hot" : "text-ink");

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur border-b border-ink">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button className="md:hidden p-2 -ml-2" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Icon.Menu className="w-6 h-6" />
          </button>

          <Link to="/" className="flex items-center gap-2 select-none">
            <span className="font-display text-3xl md:text-4xl leading-none text-ink">POP<span className="text-hot">.</span>CULTURE</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLink}>Home</NavLink>
            <NavLink to="/shop" className={navLink}>Shop</NavLink>
            <NavLink to="/shop?cat=Anime" className={navLink}>Anime</NavLink>
            <NavLink to="/shop?cat=Movies" className={navLink}>Movies</NavLink>
            <NavLink to="/about" className={navLink}>About</NavLink>
            <NavLink to="/contact" className={navLink}>Contact</NavLink>
          </nav>

          <div className="flex items-center gap-4">
            <button aria-label="Search" className="hidden md:block p-1 hover:text-hot"><Icon.Search className="w-5 h-5"/></button>
            <button aria-label="Account" className="hidden md:block p-1 hover:text-hot"><Icon.User className="w-5 h-5"/></button>
            <button
              aria-label="Cart"
              onClick={() => setDrawerOpen(true)}
              className="relative p-1 hover:text-hot"
            >
              <Icon.Cart className="w-6 h-6"/>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-hot text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-ink/60" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-cream shadow-2xl p-6 animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-10">
              <span className="font-display text-2xl">POP<span className="text-hot">.</span>CULTURE</span>
              <button onClick={() => setMobileOpen(false)}><Icon.Close className="w-6 h-6"/></button>
            </div>
            <nav className="flex flex-col gap-5 text-lg font-semibold uppercase">
              {[["Home","/"],["Shop","/shop"],["Anime","/shop?cat=Anime"],["Movies","/shop?cat=Movies"],["Music","/shop?cat=Music"],["About","/about"],["Contact","/contact"]].map(([l,h])=> (
                <Link key={h} to={h} className="border-b border-ink/20 pb-3">{l}</Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-cream mt-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="font-display text-4xl leading-none">POP<span className="text-hot">.</span>CULTURE</div>
          <p className="mt-4 text-sm text-cream/70 leading-relaxed max-w-xs">
            Made in Gurugram. Shipped across India. Wear your culture, loud and unapologetic.
          </p>
          <div className="flex gap-3 mt-6">
            {["IG","YT","X","TT"].map((s) => (
              <a key={s} className="w-9 h-9 border border-cream/30 hover:bg-acid hover:text-ink hover:border-acid flex items-center justify-center text-xs font-bold transition" href="#">{s}</a>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm uppercase tracking-widest mb-4 text-acid">Shop</div>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link to="/shop">All Products</Link></li>
            <li><Link to="/shop?cat=Anime">Anime</Link></li>
            <li><Link to="/shop?cat=Movies">Movies</Link></li>
            <li><Link to="/shop?cat=Music">Music</Link></li>
            <li><Link to="/shop?tag=limited">Limited Drops</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm uppercase tracking-widest mb-4 text-acid">Help</div>
          <ul className="space-y-2 text-sm text-cream/80">
            <li><Link to="/contact">Contact</Link></li>
            <li>Shipping & Returns</li>
            <li>Size Guide</li>
            <li>Track Order</li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm uppercase tracking-widest mb-4 text-acid">Join the cult</div>
          <p className="text-sm text-cream/70 mb-3">Drop alerts. No spam. Occasionally unhinged.</p>
          <form className="flex" onSubmit={(e)=>{e.preventDefault(); alert("Subscribed. Check your inbox.");}}>
            <input className="flex-1 bg-transparent border border-cream/30 px-3 py-2 text-sm outline-none focus:border-acid" placeholder="you@email.com" type="email" required/>
            <button className="px-4 bg-acid text-ink font-bold uppercase text-xs tracking-wider">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-cream/10 py-5 text-center text-xs text-cream/50 uppercase tracking-widest">
        © {new Date().getFullYear()} Pop Culture · Gurugram, India · Built with attitude.
      </div>
    </footer>
  );
}

/* ---------- Product Card ---------- */
function ProductCard({ p }) {
  const { addItem } = useCart();
  const front = p.images[0];
  const back = p.images[1] || p.images[0];

  const tagPill = (t) => {
    const map = {
      new: { bg: "bg-electric", text: "New" },
      bestseller: { bg: "bg-acid", text: "Bestseller" },
      limited: { bg: "bg-hot text-white", text: "Limited" },
    };
    const cfg = map[t];
    if (!cfg) return null;
    return (
      <span key={t} className={"px-2 py-1 text-[10px] font-bold uppercase tracking-wider " + cfg.bg + (cfg.text.includes && !cfg.bg.includes("text") ? " text-ink" : "")}>
        {cfg.text}
      </span>
    );
  };

  return (
    <div className="product-card group relative tilt-card">
      <Link to={`/product/${p.slug}`} className="block relative overflow-hidden bg-neutral-100 aspect-[3/4]">
        <img loading="lazy" src={front} alt={p.name} className="front absolute inset-0 w-full h-full object-cover" />
        <img loading="lazy" src={back} alt="" className="back absolute inset-0 w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {p.tags.map(tagPill)}
        </div>
        <button
          className="quick-view absolute bottom-0 left-0 right-0 bg-ink text-cream py-3 text-xs uppercase tracking-widest font-semibold hover:bg-acid hover:text-ink"
          onClick={(e) => {
            e.preventDefault();
            addItem(p, p.sizes[Math.min(1, p.sizes.length-1)], 1);
          }}
        >
          + Quick Add
        </button>
      </Link>
      <div className="pt-3 px-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-neutral-500">{p.category}</span>
          <Stars value={p.rating} size="w-3 h-3" />
        </div>
        <Link to={`/product/${p.slug}`} className="block mt-1 font-semibold text-ink hover:text-hot line-clamp-1">
          {p.name}
        </Link>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-bold">{inr(p.price)}</span>
          {p.mrp > p.price && <span className="text-xs text-neutral-500 line-through">{inr(p.mrp)}</span>}
          {p.mrp > p.price && (
            <span className="text-xs font-semibold text-hot">
              {Math.round(100 - (p.price / p.mrp) * 100)}% OFF
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Cart Drawer ---------- */
function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, updateQty, removeItem, subtotal } = useCart();
  if (!drawerOpen) return null;
  return (
    <div className="fixed inset-0 z-[60]" onClick={() => setDrawerOpen(false)}>
      <div className="absolute inset-0 bg-ink/60" />
      <aside
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-cream shadow-2xl flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-ink">
          <span className="font-display text-2xl">Your Bag</span>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close"><Icon.Close className="w-6 h-6"/></button>
        </div>
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Icon.Cart className="w-10 h-10 text-neutral-400 mb-3" />
            <p className="text-neutral-600 mb-6">Your bag is empty. Let's fix that.</p>
            <Link to="/shop" onClick={()=>setDrawerOpen(false)} className="btn-primary">Browse Shop <Icon.Arrow className="w-4 h-4"/></Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-ink/10">
              {items.map((i) => (
                <div key={i.key} className="flex gap-3 p-4">
                  <img src={i.image} className="w-20 h-24 object-cover" alt={i.name}/>
                  <div className="flex-1">
                    <div className="flex justify-between gap-2">
                      <Link to={`/product/${i.slug}`} onClick={()=>setDrawerOpen(false)} className="font-semibold leading-tight hover:text-hot">{i.name}</Link>
                      <button onClick={()=>removeItem(i.key)} className="text-neutral-400 hover:text-hot"><Icon.Close className="w-4 h-4"/></button>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">Size {i.size}</div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-ink">
                        <button className="w-7 h-7" onClick={()=>updateQty(i.key, i.qty-1)}>−</button>
                        <span className="w-8 text-center text-sm">{i.qty}</span>
                        <button className="w-7 h-7" onClick={()=>updateQty(i.key, i.qty+1)}>+</button>
                      </div>
                      <div className="font-semibold">{inr(i.price * i.qty)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-ink p-5 space-y-3">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{inr(subtotal)}</span></div>
              <div className="text-xs text-neutral-500">Shipping & taxes calculated at checkout.</div>
              <Link to="/checkout" onClick={()=>setDrawerOpen(false)} className="btn-primary w-full justify-center">Checkout <Icon.Arrow className="w-4 h-4"/></Link>
              <Link to="/cart" onClick={()=>setDrawerOpen(false)} className="btn-outline w-full justify-center">View Cart</Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------- Home Page Sections ---------- */
function Hero() {
  return (
    <section className="relative bg-cream noise overflow-hidden border-b border-ink">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-16 md:pb-24 grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-hot text-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest mb-5">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> New Drop · Midnight Ronin
          </div>
          <h1 className="font-display text-[14vw] md:text-[8.5vw] leading-[0.85] text-ink tracking-tight">
            Wear Your<br/>
            <span className="relative inline-block">
              <span className="relative z-10">Culture</span>
              <span className="absolute bottom-1 left-0 right-0 h-5 bg-acid -z-0"></span>
            </span>
          </h1>
          <p className="mt-6 max-w-md text-neutral-700 text-base md:text-lg">
            Heavyweight cotton. Loud graphics. Limited drops from Gurugram.
            For the anime-bingers, movie-quoters, and late-night meme-lords.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/shop" className="btn-primary">Shop the drop <Icon.Arrow className="w-4 h-4"/></Link>
            <Link to="/shop?tag=limited" className="btn-outline">Limited edition</Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-neutral-600">
            <div className="flex items-center gap-2"><Icon.Truck className="w-5 h-5"/>Free shipping ₹1499+</div>
            <div className="flex items-center gap-2"><Icon.Return className="w-5 h-5"/>7-day returns</div>
            <div className="hidden sm:flex items-center gap-2"><Icon.Shield className="w-5 h-5"/>Secure checkout</div>
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[4/5] md:aspect-[3/4] bg-ink overflow-hidden">
            <img src="Artboard14_37.jpg" alt="Featured tee" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-cream/95 backdrop-blur px-4 py-3">
              <div>
                <div className="font-display text-2xl leading-none">Midnight Ronin</div>
                <div className="text-xs text-neutral-600 mt-1">Limited · 300 units</div>
              </div>
              <Link to="/product/midnight-ronin-tee" className="text-xs font-bold uppercase tracking-widest hover:text-hot flex items-center gap-1">View <Icon.Arrow className="w-4 h-4"/></Link>
            </div>
          </div>
          <div className="hidden md:block absolute -top-6 -right-6 w-28 h-28 bg-acid rounded-full flex items-center justify-center rotate-[-12deg]">
            <span className="font-display text-ink text-lg text-center leading-none p-3">Drop #12<br/>Live Now</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function CollectionsGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-widest text-hot font-semibold">Collections</div>
          <h2 className="font-display text-5xl md:text-7xl leading-none mt-2">Find Your Tribe</h2>
        </div>
        <Link to="/shop" className="hidden md:inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest hover:text-hot">
          All <Icon.Arrow className="w-4 h-4"/>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        {COLLECTIONS.map((c, i) => (
          <Link
            key={c.slug}
            to={`/shop?cat=${c.slug}`}
            className={
              "group relative overflow-hidden aspect-[4/5] bg-ink " +
              (i === 0 ? "md:col-span-2 md:row-span-2 md:aspect-auto" : "")
            }
          >
            <img
              src={c.image} alt={c.name}
              className="absolute inset-0 w-full h-full object-cover transition group-hover:scale-105 duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4 text-cream">
              <div className="font-display text-4xl md:text-5xl leading-none">{c.name}</div>
              <div className="text-xs md:text-sm mt-1 text-cream/80">{c.tagline}</div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold opacity-0 group-hover:opacity-100 transition">
                Shop {c.name} <Icon.Arrow className="w-4 h-4"/>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRail({ title, subtitle, products, cta }) {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          {subtitle && <div className="text-xs uppercase tracking-widest text-hot font-semibold">{subtitle}</div>}
          <h2 className="font-display text-4xl md:text-6xl leading-none mt-2">{title}</h2>
        </div>
        {cta && (
          <Link to={cta.href} className="hidden md:inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest hover:text-hot">
            {cta.label} <Icon.Arrow className="w-4 h-4"/>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

function LimitedBanner() {
  return (
    <section className="bg-ink text-cream overflow-hidden relative">
      <div className="marquee py-6 border-b border-cream/10">
        <div className="marquee-track gap-16 px-8 font-display text-5xl md:text-7xl text-cream">
          {Array.from({length:8}).map((_,i)=>(
            <span key={i} className="flex items-center gap-16">
              <span>Limited Drop</span>
              <span className="text-hot">●</span>
              <span className="text-acid">Only 300 Made</span>
              <span className="text-hot">●</span>
            </span>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="text-xs uppercase tracking-widest text-acid font-semibold">Drop #12</div>
          <h2 className="font-display text-6xl md:text-8xl leading-[0.9] mt-3">
            When it's gone,<br/><span className="text-hot">it's gone.</span>
          </h2>
          <p className="mt-6 max-w-md text-cream/70">
            Tiny batches. Hand-screened prints. Individually numbered.
            Our limited drops never restock — and that's the point.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/shop?tag=limited" className="btn-primary bg-acid text-ink border-acid hover:bg-cream hover:border-cream">
              Shop limited <Icon.Arrow className="w-4 h-4"/>
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PRODUCTS.filter(p=>p.tags.includes("limited")).slice(0,4).map(p=>(
            <Link key={p.id} to={`/product/${p.slug}`} className="block bg-neutral-900 aspect-[3/4] overflow-hidden group">
              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-700"/>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24">
      <div className="text-center mb-12">
        <div className="text-xs uppercase tracking-widest text-hot font-semibold">Reviews</div>
        <h2 className="font-display text-5xl md:text-7xl leading-none mt-2">10,000+ love letters</h2>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Stars value={5} />
          <span className="text-sm text-neutral-600">4.9/5 from 2,400+ verified reviews</span>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {TESTIMONIALS.map((t, i) => (
          <div key={i} className="p-6 border-2 border-ink bg-white/60 tilt-card">
            <Stars value={t.rating} />
            <p className="mt-4 text-[15px] leading-relaxed text-neutral-800">"{t.text}"</p>
            <div className="mt-5 pt-5 border-t border-ink/10">
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-neutral-500">{t.location} · Verified Buyer</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="bg-acid text-ink border-t border-b border-ink">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-6">
        <h2 className="font-display text-5xl md:text-7xl leading-none">Go on. Flex your fandom.</h2>
        <Link to="/shop" className="btn-primary border-ink bg-ink text-cream hover:bg-hot hover:border-hot hover:text-white">
          Shop Everything <Icon.Arrow className="w-4 h-4"/>
        </Link>
      </div>
    </section>
  );
}

function HomePage() {
  const bestsellers = PRODUCTS.filter(p => p.tags.includes("bestseller")).slice(0,8);
  const newArrivals = PRODUCTS.filter(p => p.tags.includes("new")).slice(0,8);
  return (
    <>
      <Hero />
      <CollectionsGrid />
      <ProductRail
        title="Best Sellers"
        subtitle="Most Wanted"
        products={bestsellers}
        cta={{ label: "Shop All", href: "/shop" }}
      />
      <LimitedBanner />
      <ProductRail
        title="New Arrivals"
        subtitle="Fresh Off The Press"
        products={newArrivals}
        cta={{ label: "See All New", href: "/shop?tag=new" }}
      />
      <Testimonials />
      <CtaSection />
    </>
  );
}

/* ---------- Shop Page ---------- */
function ShopPage() {
  const loc = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(loc.search);
  const initialCat = query.get("cat") || "All";
  const initialTag = query.get("tag") || "";

  const [cat, setCat] = useState(initialCat);
  const [tag, setTag] = useState(initialTag);
  const [sizes, setSizes] = useState([]);
  const [priceMax, setPriceMax] = useState(2500);
  const [sort, setSort] = useState("popularity");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setCat(query.get("cat") || "All");
    setTag(query.get("tag") || "");
    // eslint-disable-next-line
  }, [loc.search]);

  const cats = ["All", ...new Set(PRODUCTS.map(p => p.category))];
  const allSizes = ["S","M","L","XL","XXL"];

  const filtered = useMemo(() => {
    let arr = PRODUCTS.slice();
    if (cat !== "All") arr = arr.filter(p => p.category === cat);
    if (tag) arr = arr.filter(p => p.tags.includes(tag));
    if (sizes.length) arr = arr.filter(p => p.sizes.some(s => sizes.includes(s)));
    arr = arr.filter(p => p.price <= priceMax);
    if (sort === "price-asc") arr.sort((a,b)=>a.price-b.price);
    else if (sort === "price-desc") arr.sort((a,b)=>b.price-a.price);
    else if (sort === "newest") arr.sort((a,b)=> (b.tags.includes("new")?1:0) - (a.tags.includes("new")?1:0));
    else arr.sort((a,b)=>b.rating - a.rating);
    return arr;
  }, [cat, tag, sizes, priceMax, sort]);

  const toggleSize = (s) =>
    setSizes((arr) => arr.includes(s) ? arr.filter(x=>x!==s) : [...arr, s]);

  const setCategory = (c) => {
    setCat(c);
    const q = new URLSearchParams();
    if (c !== "All") q.set("cat", c);
    if (tag) q.set("tag", tag);
    navigate("/shop" + (q.toString() ? `?${q}` : ""), { replace: true });
  };

  const FilterPanel = (
    <aside className="space-y-8">
      <div>
        <h4 className="font-display text-2xl mb-3">Category</h4>
        <ul className="space-y-2">
          {cats.map((c) => (
            <li key={c}>
              <button
                onClick={() => setCategory(c)}
                className={"text-sm w-full text-left py-1 " + (cat === c ? "font-bold text-hot" : "hover:text-hot")}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="font-display text-2xl mb-3">Size</h4>
        <div className="flex flex-wrap gap-2">
          {allSizes.map((s) => (
            <button key={s} onClick={()=>toggleSize(s)} className={"chip " + (sizes.includes(s) ? "active" : "")}>{s}</button>
          ))}
        </div>
      </div>
      <div>
        <h4 className="font-display text-2xl mb-3">Price</h4>
        <input
          type="range" min="500" max="2500" step="100"
          value={priceMax}
          onChange={(e)=>setPriceMax(Number(e.target.value))}
          className="w-full accent-ink"
        />
        <div className="text-sm mt-1 text-neutral-600">Up to {inr(priceMax)}</div>
      </div>
      <div>
        <h4 className="font-display text-2xl mb-3">Tag</h4>
        <div className="flex flex-wrap gap-2">
          {["", "new", "bestseller", "limited"].map((t) => (
            <button key={t||"all"} onClick={()=>setTag(t)} className={"chip " + (tag === t ? "active" : "")}>
              {t || "Any"}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-16">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-widest text-hot font-semibold">Shop</div>
        <h1 className="font-display text-6xl md:text-8xl leading-none mt-2">
          {cat === "All" ? "All Tees" : cat} {tag && <span className="text-hot">/ {tag}</span>}
        </h1>
        <p className="text-neutral-600 mt-2">{filtered.length} products</p>
      </div>

      <div className="flex items-center justify-between mb-6 md:hidden">
        <button onClick={()=>setShowFilters(true)} className="chip">Filters</button>
        <select value={sort} onChange={(e)=>setSort(e.target.value)} className="chip bg-transparent">
          <option value="popularity">Popularity</option>
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>

      <div className="grid md:grid-cols-[240px_1fr] gap-8 md:gap-12">
        <div className="hidden md:block">{FilterPanel}</div>

        <div>
          <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex gap-2 flex-wrap">
              {cat !== "All" && <button onClick={()=>setCategory("All")} className="chip active">{cat} ✕</button>}
              {tag && <button onClick={()=>setTag("")} className="chip active">{tag} ✕</button>}
              {sizes.map(s => (
                <button key={s} onClick={()=>toggleSize(s)} className="chip active">Size {s} ✕</button>
              ))}
            </div>
            <select value={sort} onChange={(e)=>setSort(e.target.value)} className="border-2 border-ink px-3 py-2 text-sm bg-transparent font-semibold">
              <option value="popularity">Sort: Popularity</option>
              <option value="newest">Sort: Newest</option>
              <option value="price-asc">Sort: Price ↑</option>
              <option value="price-desc">Sort: Price ↓</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-ink/20">
              <p className="text-neutral-600 mb-4">No products match these filters.</p>
              <button className="btn-outline" onClick={()=>{setCategory("All"); setTag(""); setSizes([]); setPriceMax(2500);}}>Reset filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filtered.map(p => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 bg-ink/60" onClick={()=>setShowFilters(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-xs bg-cream p-6 overflow-y-auto animate-slide-in" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-display text-3xl">Filters</span>
              <button onClick={()=>setShowFilters(false)}><Icon.Close className="w-6 h-6"/></button>
            </div>
            {FilterPanel}
            <button onClick={()=>setShowFilters(false)} className="btn-primary w-full justify-center mt-8">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Product Detail ---------- */
function ProductDetailPage() {
  const { slug } = useParams();
  const product = PRODUCTS.find(p => p.slug === slug);
  const { addItem, setDrawerOpen } = useCart();
  const nav = useNavigate();
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState("details");

  useEffect(() => {
    window.scrollTo(0, 0);
    setActive(0);
    setSize(null);
    setQty(1);
  }, [slug]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto text-center py-32">
        <h1 className="font-display text-5xl mb-4">Product not found</h1>
        <Link to="/shop" className="btn-primary">Back to Shop</Link>
      </div>
    );
  }

  const related = PRODUCTS.filter(p => p.category === product.category && p.id !== product.id).slice(0,4);

  const handleAdd = (buyNow=false) => {
    if (!size) { alert("Please select a size."); return; }
    addItem(product, size, qty);
    if (buyNow) { setDrawerOpen(false); nav("/checkout"); }
  };

  const discount = Math.round(100 - (product.price / product.mrp) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-16">
      <nav className="text-xs uppercase tracking-widest text-neutral-500 mb-6">
        <Link to="/" className="hover:text-hot">Home</Link> / <Link to="/shop" className="hover:text-hot">Shop</Link> / <Link to={`/shop?cat=${product.category}`} className="hover:text-hot">{product.category}</Link> / <span className="text-ink">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-14">
        {/* Gallery */}
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div className="flex md:flex-col gap-3 order-2 md:order-1">
            {product.images.map((im, i) => (
              <button
                key={im} onClick={()=>setActive(i)}
                className={"block w-20 h-24 overflow-hidden border-2 " + (active === i ? "border-ink" : "border-transparent")}
              >
                <img src={im} alt="" className="w-full h-full object-cover"/>
              </button>
            ))}
          </div>
          <div className="order-1 md:order-2 aspect-[3/4] bg-neutral-100 overflow-hidden">
            <img src={product.images[active]} alt={product.name} className="w-full h-full object-cover"/>
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            {product.tags.map((t) => (
              <span key={t} className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-ink text-cream">{t}</span>
            ))}
            <span className="text-[10px] font-bold uppercase tracking-widest">{product.category}</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl leading-none">{product.name}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Stars value={product.rating}/>
            <span className="text-sm text-neutral-600">{product.rating} · {product.reviewCount} reviews</span>
          </div>

          <div className="flex items-baseline gap-3 mt-6">
            <div className="text-3xl font-bold">{inr(product.price)}</div>
            <div className="text-neutral-500 line-through">{inr(product.mrp)}</div>
            <div className="text-hot font-bold">{discount}% OFF</div>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Inclusive of all taxes</div>

          <p className="mt-6 text-neutral-700 leading-relaxed">{product.description}</p>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold uppercase tracking-widest">Size</span>
              <button className="text-xs underline">Size guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={()=>setSize(s)}
                  className={"w-14 h-12 border-2 border-ink font-semibold " + (size === s ? "bg-ink text-cream" : "hover:bg-ink hover:text-cream")}
                >{s}</button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-semibold uppercase tracking-widest">Qty</span>
            <div className="flex items-center border-2 border-ink">
              <button className="w-10 h-10" onClick={()=>setQty(Math.max(1,qty-1))}>−</button>
              <span className="w-10 text-center">{qty}</span>
              <button className="w-10 h-10" onClick={()=>setQty(qty+1)}>+</button>
            </div>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            <button onClick={()=>handleAdd(false)} className="btn-primary justify-center">Add to Bag <Icon.Cart className="w-4 h-4"/></button>
            <button onClick={()=>handleAdd(true)} className="btn-outline justify-center">Buy Now <Icon.Arrow className="w-4 h-4"/></button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-3 border border-ink/20"><Icon.Truck className="w-5 h-5 mx-auto mb-1"/>Free ship ₹1499+</div>
            <div className="p-3 border border-ink/20"><Icon.Return className="w-5 h-5 mx-auto mb-1"/>7-day returns</div>
            <div className="p-3 border border-ink/20"><Icon.Shield className="w-5 h-5 mx-auto mb-1"/>Secure checkout</div>
          </div>

          {/* Tabs */}
          <div className="mt-10 border-t border-ink/20">
            <div className="flex gap-6 border-b border-ink/20">
              {["details","reviews","shipping"].map((t) => (
                <button key={t} onClick={()=>setTab(t)} className={"py-3 text-sm font-semibold uppercase tracking-widest " + (tab === t ? "border-b-2 border-ink" : "text-neutral-500")}>{t}</button>
              ))}
            </div>
            <div className="py-5 text-sm leading-relaxed text-neutral-700">
              {tab === "details" && (
                <ul className="space-y-2">
                  {product.highlights.map((h,i)=>(
                    <li key={i} className="flex items-start gap-2"><Icon.Check className="w-4 h-4 mt-0.5 text-hot"/>{h}</li>
                  ))}
                </ul>
              )}
              {tab === "reviews" && (
                <div className="space-y-4">
                  {[
                    { name: "Aarav", text: "Quality is unreal. Fit is perfect.", rating: 5 },
                    { name: "Sneha", text: "Print hasn't faded after 10 washes. Loving it.", rating: 5 },
                    { name: "Kabir", text: "Slightly oversized — exactly what I wanted.", rating: 4 },
                  ].map((r,i)=>(
                    <div key={i} className="border-b border-ink/10 pb-3">
                      <div className="flex items-center gap-2"><Stars value={r.rating} size="w-3 h-3"/><span className="font-semibold">{r.name}</span></div>
                      <p className="mt-1">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "shipping" && (
                <div className="space-y-2">
                  <p>Dispatched within 24-48 hours from our Gurugram warehouse.</p>
                  <p>Delivery in 3-6 business days across India. Free shipping on orders over ₹1499.</p>
                  <p>Easy 7-day exchange & returns on unworn items.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-4xl md:text-5xl mb-6">You might also dig</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Cart Page ---------- */
function CartPage() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <h1 className="font-display text-6xl md:text-8xl leading-none mb-8">Your Bag</h1>
      {items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-ink/30">
          <p className="text-neutral-600 mb-4">Your bag is empty.</p>
          <Link to="/shop" className="btn-primary">Start Shopping <Icon.Arrow className="w-4 h-4"/></Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {items.map((i) => (
              <div key={i.key} className="py-5 grid grid-cols-[100px_1fr] gap-4 md:gap-6 items-start">
                <img src={i.image} className="w-full aspect-[3/4] object-cover" alt={i.name} />
                <div>
                  <div className="flex justify-between gap-3">
                    <div>
                      <Link to={`/product/${i.slug}`} className="font-semibold hover:text-hot">{i.name}</Link>
                      <div className="text-xs text-neutral-500 mt-1">Size {i.size}</div>
                    </div>
                    <div className="font-semibold">{inr(i.price * i.qty)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border-2 border-ink">
                      <button className="w-9 h-9" onClick={()=>updateQty(i.key, i.qty-1)}>−</button>
                      <span className="w-10 text-center">{i.qty}</span>
                      <button className="w-9 h-9" onClick={()=>updateQty(i.key, i.qty+1)}>+</button>
                    </div>
                    <button onClick={()=>removeItem(i.key)} className="text-xs uppercase tracking-widest text-neutral-500 hover:text-hot">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="bg-white/60 border-2 border-ink p-6 h-fit">
            <h3 className="font-display text-3xl mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{shipping ? inr(shipping) : "FREE"}</span></div>
              <div className="flex justify-between pt-3 border-t border-ink/20 text-base font-bold"><span>Total</span><span>{inr(total)}</span></div>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-hot mt-3">Add {inr(1499 - subtotal)} more for free shipping.</p>
            )}
            <Link to="/checkout" className="btn-primary w-full justify-center mt-5">Checkout <Icon.Arrow className="w-4 h-4"/></Link>
            <Link to="/shop" className="btn-outline w-full justify-center mt-3">Continue Shopping</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ---------- Checkout ---------- */
function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const shipping = subtotal >= 1499 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;
  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(false);

  const placeOrder = (e) => {
    e.preventDefault();
    clear();
    setPlaced(true);
  };

  if (placed) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <div className="w-16 h-16 bg-acid mx-auto flex items-center justify-center">
          <Icon.Check className="w-10 h-10"/>
        </div>
        <h1 className="font-display text-6xl mt-6">Order placed!</h1>
        <p className="text-neutral-600 mt-2">Confirmation sent. Track your drop — it's on its way.</p>
        <button onClick={()=>nav("/")} className="btn-primary mt-8">Keep browsing <Icon.Arrow className="w-4 h-4"/></button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-32 px-4">
        <h1 className="font-display text-5xl mb-4">Nothing to check out</h1>
        <Link to="/shop" className="btn-primary">Find something</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <h1 className="font-display text-5xl md:text-7xl leading-none mb-8">Checkout</h1>
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest mb-8">
        {["Shipping","Payment","Review"].map((s,i)=>(
          <React.Fragment key={s}>
            <span className={step >= i+1 ? "font-bold text-ink" : "text-neutral-400"}>{i+1}. {s}</span>
            {i < 2 && <span className="text-neutral-300">—</span>}
          </React.Fragment>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        <form onSubmit={placeOrder} className="space-y-8">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-display text-3xl">Shipping Address</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <Input label="Full Name" required/>
                <Input label="Phone" required type="tel"/>
                <Input label="Email" required type="email" className="md:col-span-2"/>
                <Input label="Address" required className="md:col-span-2"/>
                <Input label="City" required defaultValue="Gurugram"/>
                <Input label="State" required defaultValue="Haryana"/>
                <Input label="Pincode" required/>
                <Input label="Landmark (optional)"/>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={()=>setStep(2)} className="btn-primary">Continue to Payment <Icon.Arrow className="w-4 h-4"/></button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-display text-3xl">Payment</h3>
              {["UPI","Card","COD","Net Banking"].map(m => (
                <label key={m} className="flex items-center gap-3 p-4 border-2 border-ink cursor-pointer hover:bg-ink hover:text-cream transition">
                  <input type="radio" name="pay" defaultChecked={m==="UPI"} className="accent-hot"/>
                  <span className="font-semibold">{m}</span>
                </label>
              ))}
              <div className="flex justify-between">
                <button type="button" onClick={()=>setStep(1)} className="btn-outline">Back</button>
                <button type="button" onClick={()=>setStep(3)} className="btn-primary">Review Order <Icon.Arrow className="w-4 h-4"/></button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-display text-3xl">Review</h3>
              <div className="border-2 border-ink divide-y divide-ink/10">
                {items.map(i => (
                  <div key={i.key} className="flex gap-3 p-3">
                    <img src={i.image} className="w-16 h-20 object-cover"/>
                    <div className="flex-1 text-sm">
                      <div className="font-semibold">{i.name}</div>
                      <div className="text-xs text-neutral-500">Size {i.size} · Qty {i.qty}</div>
                    </div>
                    <div className="font-semibold">{inr(i.price*i.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <button type="button" onClick={()=>setStep(2)} className="btn-outline">Back</button>
                <button type="submit" className="btn-primary">Place Order · {inr(total)} <Icon.Arrow className="w-4 h-4"/></button>
              </div>
            </div>
          )}
        </form>

        <aside className="bg-white/60 border-2 border-ink p-6 h-fit">
          <h3 className="font-display text-3xl mb-4">Summary</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
            {items.map(i => (
              <div key={i.key} className="flex gap-2 text-xs">
                <img src={i.image} className="w-10 h-12 object-cover"/>
                <div className="flex-1">
                  <div className="font-semibold leading-tight">{i.name}</div>
                  <div className="text-neutral-500">{i.size} · {i.qty}×</div>
                </div>
                <div className="font-semibold">{inr(i.price*i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-ink/20 pt-3">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shipping ? inr(shipping) : "FREE"}</span></div>
            <div className="flex justify-between pt-2 border-t border-ink/20 font-bold text-base"><span>Total</span><span>{inr(total)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Input = ({ label, className = "", ...rest }) => (
  <label className={"block " + className}>
    <span className="text-xs uppercase tracking-widest font-semibold">{label}</span>
    <input {...rest} className="mt-1 w-full border-2 border-ink px-3 py-3 bg-transparent outline-none focus:border-hot" />
  </label>
);

/* ---------- About ---------- */
function AboutPage() {
  return (
    <div>
      <section className="bg-ink text-cream py-20 md:py-28 px-4 md:px-8 text-center border-b border-ink">
        <div className="text-xs uppercase tracking-widest text-acid">Our Story</div>
        <h1 className="font-display text-6xl md:text-9xl leading-none mt-2">Born from fandom.</h1>
        <p className="max-w-2xl mx-auto mt-5 text-cream/70">
          Pop Culture started in 2022 in a 2BHK in Gurugram with three friends, one screen printer, and way too many Blu-rays. Today, we design, print, and ship small-batch streetwear for fans who refuse to blend in.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-8 py-20 grid md:grid-cols-2 gap-10">
        <div>
          <div className="text-xs uppercase tracking-widest text-hot font-semibold">Vision</div>
          <h2 className="font-display text-5xl mt-2">Fashion that talks.</h2>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            Every tee is a conversation starter. We believe the stuff you love — the films, the shows, the bars, the memes — deserves to be worn proudly, not just screenshotted.
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-hot font-semibold">Mission</div>
          <h2 className="font-display text-5xl mt-2">Loud. Local. Limited.</h2>
          <p className="mt-4 text-neutral-700 leading-relaxed">
            We make less, better. Heavy-cotton, hand-finished, ethically printed tees, in small runs. When a drop sells out, we move on — because no one wants to see five strangers in the same shirt.
          </p>
        </div>
      </section>

      <section className="bg-acid border-y border-ink">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            ["50k+","Tees shipped"],
            ["120+","Original designs"],
            ["28","States reached"],
            ["4.9★","Average rating"],
          ].map(([n,l])=>(
            <div key={l}>
              <div className="font-display text-6xl md:text-7xl leading-none">{n}</div>
              <div className="text-xs uppercase tracking-widest mt-2">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <h2 className="font-display text-5xl md:text-6xl mb-10">How we make it</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            ["01","Design","Every graphic is drawn in-house by our team of illustrators and culture nerds."],
            ["02","Print","Hand-screened and DTF-printed in Gurugram, on heavyweight 240 GSM combed cotton."],
            ["03","Ship","Packaged in recyclable mailers, dispatched in 24 hours, delivered across India."],
          ].map(([n,t,d])=>(
            <div key={n} className="p-6 border-2 border-ink bg-white/60">
              <div className="font-display text-5xl text-hot">{n}</div>
              <div className="font-display text-3xl mt-2">{t}</div>
              <p className="mt-3 text-sm text-neutral-700">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <CtaSection/>
    </div>
  );
}

/* ---------- Contact ---------- */
function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16">
      <div className="text-xs uppercase tracking-widest text-hot font-semibold">Contact</div>
      <h1 className="font-display text-6xl md:text-8xl leading-none mt-2">Say hi.</h1>
      <p className="text-neutral-700 mt-3 max-w-xl">We usually reply within a business day. Big ideas, collabs, and complaints all welcome.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-10">
        <form onSubmit={(e)=>{e.preventDefault(); setSent(true);}} className="space-y-4">
          {sent ? (
            <div className="p-6 border-2 border-ink bg-acid">
              <div className="font-display text-3xl">Got it.</div>
              <p className="text-sm mt-1">We'll be in touch shortly.</p>
            </div>
          ) : (
            <>
              <Input label="Name" required/>
              <Input label="Email" type="email" required/>
              <Input label="Subject" required/>
              <label className="block">
                <span className="text-xs uppercase tracking-widest font-semibold">Message</span>
                <textarea required rows="5" className="mt-1 w-full border-2 border-ink px-3 py-3 bg-transparent outline-none focus:border-hot"></textarea>
              </label>
              <button className="btn-primary">Send message <Icon.Arrow className="w-4 h-4"/></button>
            </>
          )}
        </form>

        <div className="space-y-6">
          <div className="p-6 border-2 border-ink bg-white/60">
            <div className="text-xs uppercase tracking-widest text-hot font-semibold">HQ</div>
            <div className="font-display text-3xl mt-1">Gurugram, India</div>
            <p className="mt-2 text-sm text-neutral-700">
              Pop Culture Apparel Pvt. Ltd.<br/>
              Sector 44, Gurugram, Haryana 122003
            </p>
          </div>
          <div className="p-6 border-2 border-ink bg-white/60">
            <div className="text-xs uppercase tracking-widest text-hot font-semibold">Email</div>
            <a href="mailto:hello@popculture.in" className="font-display text-3xl mt-1 block hover:text-hot">hello@popculture.in</a>
            <p className="text-xs text-neutral-500 mt-1">For support: support@popculture.in</p>
          </div>
          <div className="p-6 border-2 border-ink bg-white/60">
            <div className="text-xs uppercase tracking-widest text-hot font-semibold">Phone</div>
            <a href="tel:+919999999999" className="font-display text-3xl mt-1 block hover:text-hot">+91 99999 99999</a>
            <p className="text-xs text-neutral-500 mt-1">Mon–Sat · 10am–7pm IST</p>
          </div>
          <div className="aspect-video overflow-hidden border-2 border-ink">
            <iframe
              title="Gurugram Map"
              className="w-full h-full"
              loading="lazy"
              src="https://www.openstreetmap.org/export/embed.html?bbox=77.04%2C28.45%2C77.12%2C28.50&layer=mapnik"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Scroll reset ---------- */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

/* ---------- Layout ---------- */
function Layout({ children }) {
  return (
    <>
      <ScrollToTop/>
      <Header/>
      <main className="min-h-[50vh]">
        {children}
      </main>
      <Footer/>
      <CartDrawer/>
    </>
  );
}

/* ---------- App ---------- */
function App() {
  return (
    <CartProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage/>}/>
            <Route path="/shop" element={<ShopPage/>}/>
            <Route path="/product/:slug" element={<ProductDetailPage/>}/>
            <Route path="/cart" element={<CartPage/>}/>
            <Route path="/checkout" element={<CheckoutPage/>}/>
            <Route path="/about" element={<AboutPage/>}/>
            <Route path="/contact" element={<ContactPage/>}/>
            <Route path="*" element={
              <div className="max-w-xl mx-auto text-center py-32 px-4">
                <h1 className="font-display text-7xl">404</h1>
                <p className="text-neutral-600 mt-2 mb-6">This page doesn't exist (yet).</p>
                <Link to="/" className="btn-primary">Back home</Link>
              </div>
            }/>
          </Routes>
        </Layout>
      </HashRouter>
    </CartProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
