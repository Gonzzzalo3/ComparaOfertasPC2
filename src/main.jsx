import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { ArrowDownUp, ArrowRight, Bell, Check, ChevronDown, CircleHelp, ExternalLink, Heart, ListChecks, LogIn, LogOut, MapPin, Plus, Search, ShieldCheck, ShoppingBasket, SlidersHorizontal, Sparkles, Store, UserRound, X } from 'lucide-react';
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
  const [supabase, setSupabase] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const preferencesOwnerRef = useRef(null);
  const [preferencesVersion, setPreferencesVersion] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    let subscription;
    fetch('/api/config')
      .then((response) => { if (!response.ok) throw new Error('La cuenta aún no está configurada.'); return response.json(); })
      .then(({ supabaseUrl, publishableKey }) => {
        if (!active) return;
        const client = createClient(supabaseUrl, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        setSupabase(client);
        setAuthStatus('ready');
        client.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null); });
        const { data } = client.auth.onAuthStateChange((event, session) => {
          setUser(session?.user ?? null);
          if (event === 'SIGNED_OUT') {
            setFavorites(readSaved('cof-favorites', []));
            setBasket(readSaved('cof-basket', []));
            setThresholds(readSaved('cof-thresholds', {}));
          }
          if (event === 'PASSWORD_RECOVERY') setAuthOpen(true);
        });
        subscription = data.subscription;
      })
      .catch(() => { if (active) setAuthStatus('unavailable'); });
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    preferencesOwnerRef.current = null;
    if (!user || !supabase) return () => { active = false; };
    supabase.from('user_preferences').select('favorites,basket,thresholds').eq('user_id', user.id).maybeSingle()
      .then(({ data, error: cause }) => {
        if (!active) return;
        if (cause) {
          setSyncStatus('No se pudieron cargar las preferencias de tu cuenta.');
          setFavorites([]); setBasket([]); setThresholds({});
          return;
        }
        setFavorites(Array.isArray(data?.favorites) ? data.favorites : []);
        setBasket(Array.isArray(data?.basket) ? data.basket : []);
        setThresholds(data?.thresholds && typeof data.thresholds === 'object' ? data.thresholds : {});
        preferencesOwnerRef.current = user.id;
        setPreferencesVersion((version) => version + 1);
      });
    return () => { active = false; };
  }, [user?.id, supabase]);

  useEffect(() => {
    if (!user || !supabase || preferencesOwnerRef.current !== user.id) return undefined;
    const timer = setTimeout(async () => {
      const { error: cause } = await supabase.from('user_preferences').upsert({
        user_id: user.id, favorites, basket, thresholds, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setSyncStatus(cause ? 'No se pudieron sincronizar tus preferencias.' : 'Preferencias sincronizadas');
    }, 500);
    return () => clearTimeout(timer);
  }, [user?.id, supabase, preferencesVersion, favorites, basket, thresholds]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.querySelector('.search-box input')?.focus();
      }
      if (event.key === 'Escape') { setDialog(null); setAuthOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (category !== 'Todos') params.set('category', category);
    if (chain !== 'Todas las tiendas') params.set('chain', chain);
    let active = true;
    fetch(`/api/offers?${params}`, { headers: { Accept: 'application/json' } })
      .then((response) => { if (!response.ok) throw new Error('No se pudo conectar con el catálogo.'); return response.json(); })
      .then((data) => { if (active) { setOffers(data.items); setMode(data.dataMode); setError(''); } })
      .catch((cause) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [search, category, chain, refreshToken]);

  useEffect(() => { if (!user) localStorage.setItem('cof-favorites', JSON.stringify(favorites)); }, [user?.id, favorites]);
  useEffect(() => { if (!user) localStorage.setItem('cof-basket', JSON.stringify(basket)); }, [user?.id, basket]);
  useEffect(() => { if (!user) localStorage.setItem('cof-thresholds', JSON.stringify(thresholds)); }, [user?.id, thresholds]);

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
  const topDiscount = Math.round(Math.max(0, ...offers.map(savings)));

  function toggleFavorite(key) { setFavorites((current) => current.includes(key) ? current.filter((id) => id !== key) : [...current, key]); }
  function toggleBasket(id) { setBasket((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function saveThreshold(key, value) { setThresholds((current) => ({ ...current, [key]: Number(value) })); }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#inicio" aria-label="ComparaOfertas, inicio"><span className="brand-mark"><ShoppingBasket size={21}/></span><span>compara<span className="brand-accent">ofertas</span></span></a>
      <nav className="main-nav" aria-label="Navegación principal"><a className="nav-active" href="#ofertas">Explorar ofertas</a><button onClick={() => document.getElementById('mi-lista')?.scrollIntoView({ behavior: 'smooth' })}>Mi lista <span className="nav-count">{basketOffers.length}</span></button></nav>
      <div className="top-actions"><span className="location"><MapPin size={15}/> Lima, Perú <ChevronDown size={13}/></span><button className={`account-button ${user ? 'signed-in' : ''}`} onClick={() => setAuthOpen(true)} aria-label={user ? `Cuenta de ${user.email}` : 'Iniciar sesión'} title={user?.email ?? 'Iniciar sesión'}>{user ? <><span className="account-avatar">{user.email?.slice(0, 1).toUpperCase() ?? 'U'}</span><span className="account-label">Mi cuenta</span></> : <><UserRound size={16}/><span className="account-label">{authStatus === 'loading' ? 'Cargando' : 'Ingresar'}</span></>}</button></div>
    </header>

    <main id="inicio">
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow"><Sparkles size={14}/> COMPRA MEJOR, SIN RECORRER TODAS LAS TIENDAS</span>
          <h1>Tu próxima compra<br/>empieza <em>comparando.</em></h1>
          <p>Encuentra el precio que te conviene y descubre cuánto puedes ahorrar en cada tienda.</p>
          <div className="hero-proof"><span><Check size={14}/> Precios por unidad comparables</span><span><Check size={14}/> Ofertas con fecha de vigencia</span></div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-circle circle-back"></div><div className="art-circle circle-front"></div><div className="receipt"><span>COMPRA INTELIGENTE</span><div className="receipt-line"></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-row"><i></i><b></b></div><div className="receipt-total"><span>MEJOR DESCUENTO</span><strong>{topDiscount}%</strong></div></div><div className="floating-tag"><span>↓</span> Mejor precio</div><div className="art-spark">✳</div></div>
      </section>

      <section className="search-panel" aria-label="Buscar y filtrar ofertas">
        <label className="search-box"><Search size={19}/><input value={search} onChange={(e) => { setLoading(true); setSearch(e.target.value); }} placeholder="¿Qué estás buscando hoy?" aria-label="Buscar productos, marcas o tiendas"/><kbd>Ctrl K</kbd></label>
        <label className="select-box"><SlidersHorizontal size={17}/><select value={category} onChange={(e) => { setLoading(true); setCategory(e.target.value); }} aria-label="Filtrar por categoría">{CATEGORIES.map((item) => <option key={item} value={item}>{item === 'Todos' ? 'Todas las categorías' : item}</option>)}</select></label>
        <label className="select-box store-select"><Store size={17}/><select value={chain} onChange={(e) => { setLoading(true); setChain(e.target.value); }} aria-label="Filtrar por tienda"><option>Todas las tiendas</option>{chains.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>

      <section className="catalog-section" id="ofertas">
        <div className="section-heading"><div><span className="eyebrow muted">PRECIOS A TU ALCANCE</span><h2>Ofertas para comparar <span className="result-count">{products.length}</span></h2></div><div className="catalog-actions"><button className={`text-button ${favoritesOnly ? 'active-filter' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}><Heart size={16} fill={favoritesOnly ? 'currentColor' : 'none'}/> Favoritos</button><label className="sort-select"><ArrowDownUp size={15}/><select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar ofertas"><option value="unit">Mejor precio por unidad</option><option value="savings">Mayor descuento</option></select></label></div></div>
        <div className="trust-note"><ShieldCheck size={16}/><span>{mode === 'demo' ? 'Catálogo de demostración para la actividad. Precios y tiendas ficticios: valida siempre la oferta y su vigencia en el canal oficial.' : 'Consulta las condiciones y fechas en la fuente oficial antes de comprar.'}</span><button onClick={() => setDialog({ type: 'about' })} aria-label="Información sobre los datos"><CircleHelp size={15}/></button></div>
        {error && <div className="error-state"><CircleHelp/><p>{error}</p><button className="outline-button" onClick={() => { setError(''); setLoading(true); setRefreshToken((value) => value + 1); }}>Reintentar</button></div>}
        {loading ? <div className="loading-state"><span className="loader"></span>Consultando ofertas…</div> : !products.length && !error ? <div className="empty-state"><Search size={28}/><h3>No encontramos resultados</h3><p>Prueba con otro producto o quita algún filtro.</p><button className="text-button" onClick={() => { setLoading(true); setSearch(''); setCategory('Todos'); setChain('Todas las tiendas'); setFavoritesOnly(false); }}>Limpiar filtros</button></div> : <div className="offer-grid">{products.map((group) => <OfferCard key={group.key} group={group} favorite={favorites.includes(group.key)} onFavorite={() => toggleFavorite(group.key)} onCompare={() => setDialog({ type: 'compare', group })} onAlert={() => setDialog({ type: 'alert', group })} onAdd={() => toggleBasket(group.best.id)} selected={basket.includes(group.best.id)} threshold={thresholds[group.key]}/>)}</div>}
      </section>

      <section className="shopping-list" id="mi-lista"><div className="list-heading"><div className="list-icon"><ListChecks size={20}/></div><div><span className="eyebrow muted">PLANIFICA ANTES DE SALIR</span><h2>Tu lista de compra <span className="result-count">{basketOffers.length}</span></h2></div><button className="text-button clear-list" onClick={() => setBasket([])} disabled={!basket.length}>Vaciar lista</button></div>
        {!basketOffers.length ? <p className="list-empty">Agrega productos desde las ofertas y compara el total entre tiendas.</p> : <><div className="basket-items">{basketOffers.map((offer) => <div className="basket-row" key={offer.id}><div><strong>{offer.product_name}</strong><span>{offer.presentation} · {offer.chain}</span></div><b>{money.format(offer.price)}</b><button onClick={() => toggleBasket(offer.id)} aria-label={`Quitar ${offer.product_name}`}><X size={15}/></button></div>)}</div><div className="store-totals"><span>Totales por tienda (con los productos agregados)</span>{byStore.map((store, i) => <div className={i === 0 ? 'best-total' : ''} key={store.name}><span>{store.name}{i === 0 && <small>MEJOR TOTAL</small>}</span><strong>{money.format(store.total)}</strong></div>)}</div></>}</section>
      <footer><a className="brand footer-brand" href="#inicio"><span className="brand-mark"><ShoppingBasket size={18}/></span><span>compara<span className="brand-accent">ofertas</span></span></a><span>Precios claros. Decisiones inteligentes.</span><span className="sync-status" aria-live="polite">{user && syncStatus}</span><button onClick={() => setDialog({ type: 'report' })}>¿Viste un precio incorrecto? Cuéntanos <ArrowRight size={14}/></button></footer>
    </main>
    {dialog && <AppDialog dialog={dialog} offers={offers} basket={basket} thresholds={thresholds} onClose={() => setDialog(null)} onBasket={toggleBasket} onThreshold={saveThreshold}/>}
    {authOpen && <AuthDialog supabase={supabase} user={user} authStatus={authStatus} onClose={() => setAuthOpen(false)}/>}
  </div>;
}

function AuthDialog({ supabase, user, authStatus, onClose }) {
  const [mode, setMode] = useState(window.location.hash.includes('type=recovery') ? 'recovery' : 'login');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailRateLimited, setEmailRateLimited] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage(''); setEmailRateLimited(false);
    try {
      if (!supabase) throw new Error('La cuenta no está disponible ahora. Inténtalo de nuevo en un momento.');
      if (mode === 'signup') {
        const { data, error: cause } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
        if (cause) throw cause;
        setMessage(data.session ? 'Tu cuenta quedó creada y ya puedes guardar tus preferencias.' : 'Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de spam.');
        if (data.session) onClose();
      } else if (mode === 'reset') {
        const { error: cause } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
        if (cause) throw cause;
        setMessage('Si el correo corresponde a una cuenta, recibirás un enlace para restablecer la contraseña.');
      } else if (mode === 'recovery') {
        const { error: cause } = await supabase.auth.updateUser({ password });
        if (cause) throw cause;
        setMessage('Contraseña actualizada correctamente.');
        setMode('login'); setPassword(''); window.history.replaceState(null, '', window.location.pathname);
      } else {
        const { error: cause } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (cause) throw cause;
        onClose();
      }
    } catch (cause) {
      const authError = `${cause.code ?? ''} ${cause.message ?? ''}`.toLowerCase();
      const limited = authError.includes('over_email_send_rate_limit') || authError.includes('email rate limit exceeded');
      setEmailRateLimited(limited);
      setError(limited
        ? 'Supabase alcanzó el límite temporal de correos de confirmación para este proyecto. Cambiar de dirección o repetir el envío ahora no elimina el límite.'
        : cause.message === 'Invalid login credentials' ? 'El correo o la contraseña no son correctos.'
          : authError.includes('email_address_not_authorized') ? 'El correo no está habilitado para el servicio de correo de prueba de Supabase. Configura SMTP propio o usa una cuenta autorizada del proyecto.'
            : authError.includes('email not confirmed') ? 'Confirma tu correo desde el enlace que te enviamos antes de iniciar sesión.'
              : authError.includes('user already registered') ? 'Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.'
                : authError.includes('invalid email') ? 'Revisa que la dirección de correo esté escrita correctamente.'
                  : cause.message || 'No se pudo completar la solicitud. Inténtalo de nuevo más tarde.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError('');
    const { error: cause } = await supabase.auth.signOut();
    setBusy(false);
    if (cause) setError(cause.message); else onClose();
  }

  const headings = { login: 'Qué bueno verte', signup: 'Crea tu cuenta', reset: 'Recupera tu acceso', recovery: 'Elige una nueva contraseña' };
  return <div className="modal-backdrop auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <div className="auth-aside"><a className="brand auth-brand" href="#inicio" onClick={onClose}><span className="brand-mark"><ShoppingBasket size={20}/></span><span>compara<span className="brand-accent">ofertas</span></span></a><div><span className="eyebrow">TU COMPRA, MÁS SIMPLE</span><h2>Todo lo que te conviene,<br/><em>en un solo lugar.</em></h2><p>Guarda tus favoritos y vuelve a tu lista desde cualquier dispositivo.</p></div><span className="auth-aside-foot"><ShieldCheck size={15}/> Tus preferencias son privadas</span></div>
    <div className="auth-content"><button className="icon-close auth-close" onClick={onClose} aria-label="Cerrar"><X/></button>{user ? <>
      <span className="eyebrow muted">TU PERFIL</span><h2 id="auth-title">Mi cuenta</h2><div className="profile-card"><span className="profile-avatar">{user.email?.slice(0, 1).toUpperCase() ?? 'U'}</span><div><strong>{user.email}</strong><small>{user.email_confirmed_at ? 'Correo verificado' : 'Cuenta activa'}</small></div></div><p className="auth-hint">Tu lista, favoritos y precios objetivo se sincronizan en tu cuenta.</p><button className="primary-button auth-submit" onClick={signOut} disabled={busy}><LogOut size={16}/>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
    </> : <>
      <span className="eyebrow muted">COMPARAOFERTAS</span><h2 id="auth-title">{headings[mode]}</h2><p className="auth-hint">{mode === 'signup' ? 'Regístrate gratis para mantener tus preferencias sincronizadas.' : mode === 'reset' ? 'Te enviaremos un enlace seguro a tu correo.' : mode === 'recovery' ? 'Usa una contraseña nueva de al menos seis caracteres.' : 'Inicia sesión para acceder a tus favoritos y lista.'}</p>
      <form onSubmit={submit}>
        {mode !== 'recovery' && <label className="auth-field"><span>Correo electrónico</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete="email" required/><small className="auth-field-hint">Usa una dirección que puedas abrir para confirmar tu cuenta.</small></label>}
        {mode !== 'reset' && <label className="auth-field"><span>{mode === 'recovery' ? 'Nueva contraseña' : 'Contraseña'}</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 6 caracteres" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required/></label>}
        {mode === 'login' && <button type="button" className="forgot-link" onClick={() => { setMode('reset'); setError(''); setMessage(''); }}>¿Olvidaste tu contraseña?</button>}
        {error && <div className="auth-error" role="alert">{error}</div>}{emailRateLimited && <div className="auth-rate-limit"><strong>Puedes usar ComparaOfertas mientras tanto</strong><p>Sin iniciar sesión, favoritos, lista y precios objetivo quedan guardados solo en este dispositivo.</p><button type="button" className="auth-guest" onClick={onClose}>Continuar sin cuenta <ArrowRight size={14}/></button><a href="https://supabase.com/docs/guides/auth/auth-smtp" target="_blank" rel="noreferrer noopener">Guía para configurar correo SMTP propio</a></div>}{message && <div className="success-note auth-message"><Check size={17}/>{message}</div>}
        <button className="primary-button auth-submit" type="submit" disabled={busy || authStatus !== 'ready'}>{busy ? 'Un momento…' : mode === 'login' ? <><LogIn size={16}/> Iniciar sesión</> : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar enlace' : 'Actualizar contraseña'}</button>
      </form>
      <div className="auth-switch">{mode === 'signup' ? <>¿Ya tienes una cuenta? <button onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Inicia sesión</button></> : mode === 'login' ? <>¿Aún no tienes cuenta? <button onClick={() => { setMode('signup'); setMessage(''); setError(''); }}>Regístrate gratis</button></> : <button onClick={() => { setMode('login'); setMessage(''); setError(''); }}>Volver al inicio de sesión</button>}</div>
      {authStatus === 'unavailable' && <p className="auth-config-note">El catálogo sigue disponible, pero el servidor aún no habilitó el acceso a cuentas.</p>}
    </>}</div>
  </section></div>;
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
