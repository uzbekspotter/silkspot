-- Security Advisor: RLS on reference tables exposed to PostgREST; aircraft_full as security invoker.
-- Writes to these tables remain via service role (imports) or future admin paths — not client anon DML.

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aircraft_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spotting_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select_public" ON public.countries FOR SELECT USING (true);
CREATE POLICY "airlines_select_public" ON public.airlines FOR SELECT USING (true);
CREATE POLICY "airports_select_public" ON public.airports FOR SELECT USING (true);
CREATE POLICY "aircraft_types_select_public" ON public.aircraft_types FOR SELECT USING (true);
CREATE POLICY "achievements_select_public" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "forum_categories_select_public" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "spotting_locations_select_public" ON public.spotting_locations FOR SELECT USING (true);

-- PG15+: default view behavior matches "security definer"; invoker enforces caller RLS on base tables.
ALTER VIEW public.aircraft_full SET (security_invoker = true);
