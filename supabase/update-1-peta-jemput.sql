-- =========================================================
-- SisaGuna — UPDATE 1: koordinat peta + Jemput Cepat
-- Jalankan SEKALI di Supabase → SQL Editor → New query → Run.
-- (Aman dijalankan ulang. Sudah termasuk di schema.sql untuk proyek baru.)
-- =========================================================

-- Titik lokasi listing (dipilih di peta saat posting)
alter table public.listings add column if not exists lat double precision;
alter table public.listings add column if not exists lng double precision;

-- Permintaan Jemput Cepat
create table if not exists public.pickup_requests (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  logistik_id   uuid references public.profiles(id),
  limbah        text not null,
  berat         text,
  armada        text not null,
  waktu         text not null default 'Sekarang (< 2 jam)',
  alamat        text,
  lat           double precision not null,
  lng           double precision not null,
  tujuan        text,
  catatan       text,
  ongkos        integer,
  status        text not null default 'mencari'
                check (status in ('mencari','diambil','dijemput','selesai','dibatalkan')),
  diambil_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_pickup_status on public.pickup_requests(status, created_at);
drop trigger if exists trg_pickup_updated on public.pickup_requests;
create trigger trg_pickup_updated before update on public.pickup_requests
  for each row execute function public.set_updated_at();

alter table public.pickup_requests enable row level security;

-- terlihat oleh pemohon, logistik yang mengambil, dan semua mitra logistik selama masih "mencari"
drop policy if exists "jemput cepat terlihat" on public.pickup_requests;
create policy "jemput cepat terlihat" on public.pickup_requests for select to authenticated using (
  requester_id = auth.uid() or logistik_id = auth.uid() or (status = 'mencari' and public.my_role() = 'logistik'));
-- pemohon membuat permintaan baru
drop policy if exists "buat jemput cepat" on public.pickup_requests;
create policy "buat jemput cepat" on public.pickup_requests for insert to authenticated with check (
  requester_id = auth.uid() and status = 'mencari' and logistik_id is null);
-- pemohon hanya boleh membatalkan
drop policy if exists "pemohon batalkan" on public.pickup_requests;
create policy "pemohon batalkan" on public.pickup_requests for update to authenticated
  using (requester_id = auth.uid() and status in ('mencari','diambil'))
  with check (requester_id = auth.uid() and status = 'dibatalkan');
-- mitra logistik mengambil order yang masih "mencari"
drop policy if exists "logistik ambil" on public.pickup_requests;
create policy "logistik ambil" on public.pickup_requests for update to authenticated
  using (status = 'mencari' and logistik_id is null and public.my_role() = 'logistik')
  with check (logistik_id = auth.uid() and status = 'diambil' and requester_id <> auth.uid());
-- mitra logistik memperbarui order miliknya
drop policy if exists "logistik perbarui" on public.pickup_requests;
create policy "logistik perbarui" on public.pickup_requests for update to authenticated
  using (logistik_id = auth.uid())
  with check (logistik_id = auth.uid() and requester_id <> auth.uid() and status in ('diambil','dijemput','selesai','dibatalkan'));

-- Notifikasi otomatis ke pemohon saat status berubah
create or replace function public.notify_pickup() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_driver text;
begin
  if new.status is distinct from old.status and new.status in ('diambil','dijemput','selesai') then
    select nama into v_driver from profiles where id = new.logistik_id;
    insert into notifications(user_id, judul, isi, link) values (new.requester_id,
      case new.status when 'diambil' then 'Armada ditemukan' when 'dijemput' then 'Limbah sudah dimuat' else 'Penjemputan selesai' end,
      coalesce(v_driver, 'Mitra logistik') || ' · ' || new.limbah, '#/jemput-cepat');
  end if;
  return new;
end $$;
drop trigger if exists trg_pickup_notify on public.pickup_requests;
create trigger trg_pickup_notify after update on public.pickup_requests
  for each row execute function public.notify_pickup();

grant select, insert, update on public.pickup_requests to authenticated;
