with c as (
  insert into categories (slug, name, sort_order) values ('iiko-5306bd49', 'Роллы', 0)
  on conflict (slug) do update set name = excluded.name returning id
)
insert into products (iiko_id, category_id, name, description, variants, updated_at)
select v.iiko_id, c.id, v.name, v.description, v.variants::jsonb, now()
from c, (values
('b895cae1-962b-4ec1-808f-92d64bc5f1e0','Абу-Даби  - 6 -  Запеченный','','[{"label":"шт","price":309.0,"sizeId":null}]'),
('1e59696a-5509-485e-88f1-5e6fedc1a5db','Абу-Даби  8  запеченный','','[{"label":"шт","price":333.0,"sizeId":null}]'),
('ca028bb8-ebaa-47f0-856b-61c1f1e48cf7','Австрия  8 ','','[{"label":"шт","price":395.0,"sizeId":null}]'),
('7be3012f-c248-43b4-bdd4-44a3da7f0cbe','Австрия - 6 -','','[{"label":"шт","price":355.0,"sizeId":null}]'),
('87c3ddc2-cd05-47cb-b701-d636df590f0c','Акапулько  8','','[{"label":"шт","price":409.0,"sizeId":null}]'),
('13c55ce5-723f-4740-bc7c-33702b650193','Акапулько - 6 -','','[{"label":"шт","price":369.0,"sizeId":null}]'),
('953291b8-1712-41e5-94c8-c0c3ccb990a2','Аляска  8','','[{"label":"шт","price":312.0,"sizeId":null}]'),
('926f0cfb-b72c-47a5-a300-c3405d9394ac','Аляска - 6 -','','[{"label":"шт","price":289.0,"sizeId":null}]'),
('edaef0fb-ffb7-46d1-927e-6a49cceb234c','Баку  8   запеченный','','[{"label":"шт","price":360.0,"sizeId":null}]'),
('fd2710d2-f9d4-4980-9bbd-f06e64d59454','Баку - 6 -   запеченный','','[{"label":"шт","price":329.0,"sizeId":null}]'),
('b1cddc92-638e-4328-bd46-fd76e019ca43','Банзай  8','','[{"label":"шт","price":395.0,"sizeId":null}]'),
('31836320-9d4e-4a78-a03f-264229e796d3','Банзай - 6 - ','','[{"label":"шт","price":365.0,"sizeId":null}]'),
('d9d2ef6b-630a-445a-9f41-8957e098eb6e','Батакон  8','','[{"label":"шт","price":475.0,"sizeId":null}]'),
('78f9264f-9702-49f1-8e65-518c50c34bff','Батакон - 6 - ','','[{"label":"шт","price":429.0,"sizeId":null}]'),
('03fd6e94-c3f5-43b6-8b45-5f15fc69a1f5','Бодрум  8','','[{"label":"шт","price":485.0,"sizeId":null}]'),
('9d4d7a47-f248-40cd-916c-0bb57cb37686','Бодрум - 6 -','','[{"label":"шт","price":445.0,"sizeId":null}]'),
('70688708-3664-48f5-a007-a6d08dd73c57','Бруклин  8','','[{"label":"шт","price":424.0,"sizeId":null}]'),
('5db40aa8-01ee-4f80-88e9-b26961052d0f','Бруклин - 6 -','','[{"label":"шт","price":384.0,"sizeId":null}]'),
('763ff80d-ffa9-4ad9-b2a9-340d2bac16c6','Валенсия  8','','[{"label":"шт","price":359.0,"sizeId":null}]'),
('2b5a0de8-fa83-4dd7-b907-7157b8730d6d','Валенсия - 6 -','','[{"label":"шт","price":329.0,"sizeId":null}]'),
('175f667b-bb92-4309-b9a4-8e8722eb97a3','Верона  8','','[{"label":"шт","price":339.0,"sizeId":null}]'),
('f0f8f720-b560-46d8-9235-80a2e5f3e0b6','Верона - 6 -','','[{"label":"шт","price":305.0,"sizeId":null}]'),
('747667ac-e610-4973-971a-22c4ea91f589','Восток - 6 -','','[{"label":"шт","price":509.0,"sizeId":null}]')
) as v(iiko_id, name, description, variants)
on conflict (iiko_id) do update set category_id = excluded.category_id, name = excluded.name,
  description = excluded.description, variants = excluded.variants, updated_at = now();
