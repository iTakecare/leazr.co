-- Repair missing equipment for offer 5382ef59-d6c6-4506-938f-1648f991b3dd
-- Based on edge function logs, this offer should have had 2 equipments

-- Insert HP EliteBook 650 G9 15.6 pouces
INSERT INTO public.offer_equipment (
  offer_id,
  title,
  purchase_price,
  quantity,
  monthly_payment,
  margin,
  duration
) VALUES (
  '5382ef59-d6c6-4506-938f-1648f991b3dd',
  'HP EliteBook 650 G9 15.6 pouces',
  650,
  1,
  46.95,
  524.93,
  36
);

-- Insert iPad Pro M4 11 pouces  
INSERT INTO public.offer_equipment (
  offer_id,
  title,
  purchase_price,
  quantity,
  monthly_payment,
  margin,
  duration
) VALUES (
  '5382ef59-d6c6-4506-938f-1648f991b3dd',
  'iPad Pro M4 11 pouces',
  1107,
  1,
  55.95,
  893.99,
  36
);

-- Add attributes for HP EliteBook based on logs
INSERT INTO public.offer_equipment_attributes (equipment_id, key, value)
SELECT 
  oe.id,
  attr.key,
  attr.value
FROM public.offer_equipment oe
CROSS JOIN (
  VALUES 
  ('Mémoire vive (RAM)', '16 Go'),
  ('Capacité du disque dur', 'SSD 512 Go')
) AS attr(key, value)
WHERE oe.offer_id = '5382ef59-d6c6-4506-938f-1648f991b3dd'
AND oe.title = 'HP EliteBook 650 G9 15.6 pouces';

-- Add attributes for iPad Pro based on logs  
INSERT INTO public.offer_equipment_attributes (equipment_id, key, value)
SELECT 
  oe.id,
  attr.key,
  attr.value
FROM public.offer_equipment oe
CROSS JOIN (
  VALUES 
  ('Mémoire', '256 Go'),
  ('Connectivité', 'Wifi + 5G')
) AS attr(key, value)
WHERE oe.offer_id = '5382ef59-d6c6-4506-938f-1648f991b3dd'
AND oe.title = 'iPad Pro M4 11 pouces';