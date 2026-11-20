import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownUp, ArrowRight, Bell, Check, ChevronDown, CircleHelp, ExternalLink, Heart, ListChecks, MapPin, Plus, Search, ShieldCheck, ShoppingBasket, SlidersHorizontal, Sparkles, Store, X } from 'lucide-react';
import './styles.css';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const CATEGORIES = ['Todos', 'Abarrotes', 'Lácteos', 'Cuidado personal', 'Bebés'];
const readSaved = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

function App() {
  const [offers, setOffers] = useState([]);
  const [mode, setMode] = useState('demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [chain, setChain] = useState('Todas las tiendas');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState(() => readSaved('cof-favorites', []));
  const [basket, setBasket] = useState(() => readSaved('cof-basket', []));
  const [thresholds, setThresholds] = useState(() => readSaved('cof-thresholds', {}));
  const [dialog, setDialog] = useState(null);
  const [sort, setSort] = useState('unit');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (category !== 'Todos') params.set('category', category);
    if (chain !== 'Todas las tiendas') params.set('chain', chain);
    setLoading(true);
    fetch(`/api/offers?${params}`, { headers: { Accept: 'application/json' } })
      .then((response) => { if (!response.ok) throw new Error('No se pudo conectar con el catálogo.'); return response.json(); })
      .then((data) => { setOffers(data.items); setMode(data.dataMode); setError(''); })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [search, category, chain]);

  useEffect(() => { localStorage.setItem('cof-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('cof-basket', JSON.stringify(basket)); }, [basket]);
  useEffect(() => { localStorage.setItem('cof-thresholds', JSON.stringify(thresholds)); }, [thresholds]);

  const products = useMemo(() => {
    const grouped = new Map();
    for (const offer of offers) {
      const key = `${offer.product_name}|${offer.brand}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(offer);
    }
    return [...grouped.entries()].map(([key, items]) => ({ key, items: items.sort((a, b) => unitPrice(a) - unitPrice(b)), best: items[0] }))
      .filter(({ key }) => !favoritesOnly || favorites.includes(key))
      .sort((a, b) => sort === 'savings' ? savings(b.best) - savings(a.best) : unitPrice(a.best) - unitPrice(b.best));
  }, [offers, favorites, favoritesOnly, sort]);

  const chains = useMemo(() => [...new Set(offers.map((item) => item.chain))], [offers]);
  const basketOffers = basket.map((id) => offers.find((offer) => offer.id === id)).filter(Boolean);
  const stores = [...new Set(basketOffers.map((offer) => offer.chain))];
  const byStore = stores.map((name) => ({ name, total: basketOffers.filter((offer) => offer.chain === name).reduce((sum, offer) => sum + Number(offer.price), 0) })).sort((a, b) => a.total - b.total);

  function toggleFavorite(key) { setFavorites((current) => current.includes(key) ? current.filter((id) => id !== key) : [...current, key]); }
  function toggleBasket(id) { setBasket((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function saveThreshold(key, value) { setThresholds((current) => ({ ...current, [key]: Number(value) })); }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="ComparaOfertas, inicio"><span className="brand-mark"><ShoppingBasket size={21}/></span><span>compara<span className="brand-accent">ofertas</span></span></a>
      <nav className="main-nav" aria-label="Navegación principal"><a className="nav-active" href="#ofertas">Explorar ofertas</a><button onClick={() => document.getElementById('mi-lista')?.scrollIntoView({ behavior: 'smooth' })}>Mi lista <span className="nav-count">{basketOffers.length}</span></button></nav>
      <div className="top-actions"><span className="location"><MapPin size={15}/> Lima, Perú <ChevronDown size={13}/></span><button className="avatar" title="Perfil local">G</button></div>
    </header>

    <main id="inicio">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><Sparkles size={14}/> COMPRA MEJOR, SIN RECORRER TODAS LAS TIENDAS</span>
          <h1>Tu próxima compra<br/>empieza <em>comparando.</em></h1>
          <p>Encuentra el precio que te conviene y descubre cuánto puedes ahorrar en cada tienda.</p>
          <div className="hero-proof"><span><Check size={14}/> Precios por unidad comparables</span><span><Check size={14}/> Ofertas con fecha de vigencia</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-circle circle-back"></div><div className="art-circle circle-front"></div><div className="receipt"><span>COMPRA INTELIGENTE</span><div className="receipt-line"></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-total"><span>AHORRAS</span><strong>S/ 12.40</strong></div></div><div className="floating-tag"><span>↓</span> Mejor precio</div><div className="art-spark">✳</div></div>
      </section>

      <section className="search-panel" aria-label="Buscar y filtrar ofertas">
        <label className="search-box"><Search size={19}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="¿Qué estás buscando hoy?" aria-label="Buscar productos, marcas o tiendas"/><kbd>⌘ K</kbd></label>
        <label className="select-box"><SlidersHorizontal size={17}/><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrar por categoría">{CATEGORIES.map((item) => <option key={item} value={item}>{item === 'Todos' ? 'Todas las categorías' : item}</option>)}</select></label>
        <label className="select-box store-select"><Store size={17}/><select value={chain} onChange={(e) => setChain(e.target.value)} aria-label="Filtrar por tienda"><option>Todas las tiendas</option>{chains.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <section className="catalog-section" id="ofertas">
        <div className="section-heading"><div><span className="eyebrow muted">PRECIOS A TU ALCANCE</span><h2>Ofertas para comparar <span className="result-count">{products.length}</span></h2></div><div className="catalog-actions"><button className={`text-button ${favoritesOnly ? 'active-filter' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart size={16} fill={favoritesOnly ? 'currentColor' : 'none'}/> Favoritos</button><label className="sort-select"><ArrowDownUp size={15}/><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar ofertas"><option value="unit">Mejor precio por unidad</option><option value="savings">Mayor descuento</option></select></label></div></div>
        <div className="trust-note"><ShieldCheck size={16}/><span>{mode === 'demo' ? 'Catálogo de demostración para la actividad. Precios y tiendas ficticios: valida siempre la oferta y su vigencia en el canal oficial.' : 'Consulta las condiciones y fechas en la fuente oficial antes de comprar.'}</span><button onClick={() => setDialog({ type: 'about' })} aria-label="Información sobre los datos"><CircleHelp size={15}/></button></div>
        {error && <div className="error-state"><CircleHelp/><p>{error}</p><button className="outline-button" onClick={() => setSearch((value) => `${value} `)}>Reintentar</button></div>}
        {loading ? <div className="loading-state"><span className="loader"></span>Consultando ofertas…</div> : !products.length && !error ? <div className="empty-state"><Search size={28}/><h3>No encontramos resultados</h3><p>Prueba con otro producto o quita algún filtro.</p><button className="text-button" onClick={() => { setSearch(''); setCategory('Todos'); setChain('Todas las tiendas'); setFavoritesOnly(false); }}>Limpiar filtros</button></div> : <div className="offer-grid">{products.map((group) => <OfferCard key={group.key} group={group} favorite={favorites.includes(group.key)} onFavorite={() => toggleFavorite(group.key)} onCompare={() => setDialog({ type: 'compare', group })} onAlert={() => setDialog({ type: 'alert', group })} onAdd={() => toggleBasket(group.best.id)} selected={basket.includes(group.best.id)} threshold={thresholds[group.key]}/>)}</div>}
      </section>

      <section className="shopping-list" id="mi-lista"><div className="list-heading"><div className="list-icon"><ListChecks size={20}/></div><div><span className="eyebrow muted">PLANIFICA ANTES DE SALIR</span><h2>Tu lista de compra <span className="result-count">{basketOffers.length}</span></h2></div><button className="text-button clear-list" onClick={() => setBasket([])} disabled={!basket.length}>Vaciar lista</button></div>
        {!basketOffers.length ? <p className="list-empty">Agrega productos desde las ofertas y compara el total entre tiendas.</p> : <><div className="basket-items">{basketOffers.map((offer) => <div className="basket-row" key={offer.id}><div><strong>{offer.product_name}</strong><span>{offer.presentation} · {offer.chain}</span></div><b>{money.format(offer.price)}</b><button onClick={() => toggleBasket(offer.id)} aria-label={`Quitar ${offer.product_name}`}><X size={15}/></button></div>)}</div><div className="store-totals"><span>Totales por tienda (con los productos agregados)</span>{byStore.map((store, i) => <div className={i === 0 ? 'best-total' : ''} key={store.name}><span>{store.name}{i === 0 && <small>MEJOR TOTAL</small>}</span><strong>{money.format(store.total)}</strong></div>)}</div></>}</section>
      <footer><a className="brand footer-brand" href="#inicio"><span className="brand-mark"><ShoppingBasket size={18}/></span><span>compara<span className="brand-accent">ofertas</span></span></a><span>Precios claros. Decisiones inteligentes.</span><button onClick={() => setDialog({ type: 'report' })}>¿Viste un precio incorrecto? Cuéntanos <ArrowRight size={14}/></button></footer>
    </main>
    {dialog && <AppDialog dialog={dialog} offers={offers} basket={basket} thresholds={thresholds} onClose={() => setDialog(null)} onBasket={toggleBasket} onThreshold={saveThreshold}/>}
  </div>;
}

function savings(offer) { return offer.original_price > offer.price ? ((offer.original_price - offer.price) / offer.original_price) * 100 : 0; }
function unitLabel(offer) { return offer.unit === 'g' ? 'kg' : offer.unit === 'ml' ? 'L' : 'unidad'; }
function unitPrice(offer) {
  const quantity = Number(offer.unit_quantity);
  const price = Number(offer.price);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) return Number.POSITIVE_INFINITY;
  const divisor = offer.unit === 'g' || offer.unit === 'ml' ? quantity / 1000 : quantity;
  return price / divisor;
}
function unitCost(offer) { return unitPrice(offer); }

function OfferCard({ group, favorite, onFavorite, onCompare, onAlert, onAdd, selected, threshold }) {
  const { best, items } = group;
  const discount = Math.round(savings(best));
  return <article className="offer-card"><div className="card-topline"><span className="category-pill">{best.category}</span><button className={`heart-button ${favorite ? 'is-favorite' : ''}`} onClick={onFavorite} aria-label={favorite ? 'Quitar de favoritos' : 'Guardar favorito'}><Heart size={18} fill={favorite ? 'currentColor' : 'none'}/></button></div><div className={`product-illustration illustration-${best.category.toLowerCase().replaceAll(' ', '-')}`}><span>{best.category === 'Lácteos' ? '🥛' : best.category === 'Cuidado personal' ? '🧴' : best.category === 'Bebés' ? '🧸' : '🛒'}</span><small>{best.brand}</small></div><h3>{best.product_name}</h3><p className="product-meta">{best.brand} <span>·</span> {best.presentation}</p><div className="price-row"><strong>{money.format(best.price)}</strong>{best.original_price > best.price && <del>{money.format(best.original_price)}</del>}{discount > 0 && <span className="discount">-{discount}%</span>}</div><div className="unit-row"><span>{money.format(unitCost(best))} / {unitLabel(best)}</span><span className="chain-name"><Store size={13}/>{best.chain}</span></div><div className="expiry-row"><span className="live-dot"></span>Válido hasta {new Date(`${best.ends_at}T12:00:00`).toLocaleDateString('es-PE',{day:'numeric',month:'short'})}</div>{threshold && best.price <= threshold && <div className="threshold-hit"><Bell size={13}/> Llegó a tu precio objetivo</div>}<div className="card-actions"><button className="compare-button" onClick={onCompare}>Comparar {items.length > 1 && <span>{items.length}</span>}</button><button className={`add-button ${selected ? 'added' : ''}`} onClick={onAdd} title={selected ? 'Quitar de mi lista' : 'Agregar a mi lista'}>{selected ? <Check size={18}/> : <Plus size={18}/>}</button><button className="alert-button" onClick={onAlert} title="Avisarme cuando baje"><Bell size={16}/></button></div></article>;
}

function AppDialog({ dialog, basket, thresholds, onClose, onBasket, onThreshold }) {
  const [target, setTarget] = useState(thresholds[dialog.group?.key] ?? dialog.group?.best.price ?? 0);
  const [notice, setNotice] = useState('');
  const groupOffers = dialog.group?.items ?? [];
  function submitReport(event) { event.preventDefault(); const report = { message: new FormData(event.currentTarget).get('message'), createdAt: new Date().toISOString() }; const all = readSaved('cof-reports', []); localStorage.setItem('cof-reports', JSON.stringify([...all, report])); setNotice('Gracias. El reporte quedó guardado en este dispositivo para la demostración.'); event.currentTarget.reset(); }
  function submitAlert(event) { event.preventDefault(); onThreshold(dialog.group.key, target); setNotice(`Listo. Te avisaremos en esta pantalla cuando baje a ${money.format(target)} o menos.`); }
  let title = dialog.type === 'compare' ? 'Compara en otras tiendas' : dialog.type === 'alert' ? 'Configura tu precio objetivo' : dialog.type === 'report' ? 'Reportar un precio' : 'Sobre los precios de muestra';
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="eyebrow muted">COMPARAOFERTAS</span><h2 id="modal-title">{title}</h2></div><button className="icon-close" onClick={onClose} aria-label="Cerrar"><X/></button></div>
    {dialog.type === 'compare' && <><p className="modal-subtitle">{dialog.group.best.product_name} · precios por presentación y unidad normalizada.</p><div className="compare-list">{groupOffers.map((offer) => <div className={`compare-row ${offer.id === dialog.group.best.id ? 'recommended' : ''}`} key={offer.id}><div className="store-badge"><Store size={16}/></div><div className="compare-info"><strong>{offer.chain}{offer.id === dialog.group.best.id && <small>MEJOR PRECIO UNITARIO</small>}</strong><span>{offer.presentation} · hasta {new Date(`${offer.ends_at}T12:00:00`).toLocaleDateString('es-PE',{day:'numeric',month:'short'})}</span><a href={offer.source_url} target="_blank" rel="noreferrer noopener">Ver fuente de ejemplo <ExternalLink size={11}/></a></div><div className="compare-price"><strong>{money.format(offer.price)}</strong><span>{money.format(unitPrice(offer))} / {unitLabel(offer)}</span></div><button className={`add-button ${basket.includes(offer.id) ? 'added' : ''}`} onClick={() => onBasket(offer.id)} aria-label="Agregar a mi lista">{basket.includes(offer.id) ? <Check size={17}/> : <Plus size={17}/>}</button></div>)}</div></>}
    {dialog.type === 'alert' && <form onSubmit={submitAlert}><p className="modal-subtitle">{dialog.group.best.product_name}. El aviso se guarda en este dispositivo.</p><label className="field-label" htmlFor="price-target">Avisarme cuando cueste como máximo</label><div className="target-input"><span>S/</span><input id="price-target" type="number" min="0.1" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} required/></div><input className="range-input" type="range" min="1" max={Math.ceil(dialog.group.best.price * 1.5)} step="0.5" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Precio objetivo"/><button className="primary-button" type="submit"><Bell size={16}/> Guardar alerta</button></form>}
    {dialog.type === 'report' && <form onSubmit={submitReport}><p className="modal-subtitle">Cuéntanos qué oferta debemos revisar. El reporte se guarda localmente en esta demo.</p><label className="field-label" htmlFor="report-message">Producto, tienda y detalle</label><textarea id="report-message" name="message" minLength="8" maxLength="500" placeholder="Ej.: precio distinto al publicado en tienda…" required></textarea><button className="primary-button" type="submit">Enviar reporte</button></form>}
    {dialog.type === 'about' && <div className="about-copy"><p>La demostración trae información de ejemplo creada para probar búsquedas, filtros, comparación de precios unitarios y listas.</p><p>En la configuración de producción, el catálogo se consulta desde Supabase. Verifica siempre el precio, stock y vigencia en el canal oficial de cada tienda.</p></div>}
    {notice && <div className="success-note"><Check size={17}/>{notice}</div>}
    <div className="modal-footer"><ShieldCheck size={15}/> Información de ejemplo. Verifica condiciones y stock antes de comprar.<button onClick={onClose}>Cerrar</button></div>
  </section></div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
