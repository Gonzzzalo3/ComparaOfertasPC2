import demoOffers from './demo-offers.json' with { type: 'json' };

export function createOfferRepository(env = process.env) {
  const configured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
  if (!configured) return { mode: 'demo', listOffers: async () => demoOffers };

  let clientPromise;
  return {
    mode: 'supabase',
    async listOffers() {
      clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
        createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { 'X-Client-Info': 'comparaofertas-pc2/1.0' } },
        }),
      );
      const supabase = await clientPromise;
      const { data, error } = await supabase
        .from('offers')
        .select('id,chain,product_name,brand,category,presentation,unit,unit_quantity,price,original_price,starts_at,ends_at,source_url,stock')
        .order('ends_at', { ascending: true })
        .limit(250);
      if (error) throw new Error(`No se pudieron consultar las ofertas: ${error.message}`);
      return data;
    },
  };
}

export function filterOffers(offers, { search = '', category = '', chain = '', date } = {}) {
  const term = search.trim().toLocaleLowerCase('es');
  return offers
    .filter((offer) => offer.stock !== false)
    .filter((offer) => !date || (offer.starts_at <= date && offer.ends_at >= date))
    .filter((offer) => !category || offer.category === category)
    .filter((offer) => !chain || offer.chain === chain)
    .filter((offer) => !term || [offer.product_name, offer.brand, offer.category, offer.chain]
      .some((value) => value.toLocaleLowerCase('es').includes(term)))
    .sort((a, b) => unitPrice(a) - unitPrice(b));
}

export function unitPrice(offer) {
  if (!Number.isFinite(Number(offer.price)) || !Number.isFinite(Number(offer.unit_quantity)) || Number(offer.unit_quantity) <= 0) return Infinity;
  const divisor = offer.unit === 'unidad' ? Number(offer.unit_quantity) : Number(offer.unit_quantity) / (offer.unit === 'g' || offer.unit === 'ml' ? 1000 : 1);
  return Number(offer.price) / divisor;
}

export function getLocalDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
