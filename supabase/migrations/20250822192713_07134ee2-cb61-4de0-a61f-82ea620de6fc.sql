-- Criando 29 registros de referrals para Caio Martins aparecer no ranking com 29 indicações

-- Primeiro vamos criar alguns usuários fictícios para serem os referidos
INSERT INTO profiles (id, full_name, whatsapp, created_at, updated_at) VALUES
(gen_random_uuid(), 'João Silva Ref1', '(11) 99999-0001', '2025-07-29 10:00:00+00', '2025-07-29 10:00:00+00'),
(gen_random_uuid(), 'Maria Santos Ref2', '(11) 99999-0002', '2025-07-29 10:01:00+00', '2025-07-29 10:01:00+00'),
(gen_random_uuid(), 'Pedro Costa Ref3', '(11) 99999-0003', '2025-07-29 10:02:00+00', '2025-07-29 10:02:00+00'),
(gen_random_uuid(), 'Ana Lima Ref4', '(11) 99999-0004', '2025-07-29 10:03:00+00', '2025-07-29 10:03:00+00'),
(gen_random_uuid(), 'Carlos Mendes Ref5', '(11) 99999-0005', '2025-07-29 10:04:00+00', '2025-07-29 10:04:00+00'),
(gen_random_uuid(), 'Lucia Pereira Ref6', '(11) 99999-0006', '2025-07-29 10:05:00+00', '2025-07-29 10:05:00+00'),
(gen_random_uuid(), 'Roberto Alves Ref7', '(11) 99999-0007', '2025-07-29 10:06:00+00', '2025-07-29 10:06:00+00'),
(gen_random_uuid(), 'Fernanda Souza Ref8', '(11) 99999-0008', '2025-07-29 10:07:00+00', '2025-07-29 10:07:00+00'),
(gen_random_uuid(), 'Rafael Oliveira Ref9', '(11) 99999-0009', '2025-07-29 10:08:00+00', '2025-07-29 10:08:00+00'),
(gen_random_uuid(), 'Camila Rodrigues Ref10', '(11) 99999-0010', '2025-07-29 10:09:00+00', '2025-07-29 10:09:00+00'),
(gen_random_uuid(), 'Bruno Ferreira Ref11', '(11) 99999-0011', '2025-07-29 10:10:00+00', '2025-07-29 10:10:00+00'),
(gen_random_uuid(), 'Juliana Barbosa Ref12', '(11) 99999-0012', '2025-07-29 10:11:00+00', '2025-07-29 10:11:00+00'),
(gen_random_uuid(), 'Marcos Cardoso Ref13', '(11) 99999-0013', '2025-07-29 10:12:00+00', '2025-07-29 10:12:00+00'),
(gen_random_uuid(), 'Patrícia Gomes Ref14', '(11) 99999-0014', '2025-07-29 10:13:00+00', '2025-07-29 10:13:00+00'),
(gen_random_uuid(), 'Thiago Nascimento Ref15', '(11) 99999-0015', '2025-07-29 10:14:00+00', '2025-07-29 10:14:00+00'),
(gen_random_uuid(), 'Gabriela Monteiro Ref16', '(11) 99999-0016', '2025-07-29 10:15:00+00', '2025-07-29 10:15:00+00'),
(gen_random_uuid(), 'Leonardo Dias Ref17', '(11) 99999-0017', '2025-07-29 10:16:00+00', '2025-07-29 10:16:00+00'),
(gen_random_uuid(), 'Vanessa Castro Ref18', '(11) 99999-0018', '2025-07-29 10:17:00+00', '2025-07-29 10:17:00+00'),
(gen_random_uuid(), 'Diego Araujo Ref19', '(11) 99999-0019', '2025-07-29 10:18:00+00', '2025-07-29 10:18:00+00'),
(gen_random_uuid(), 'Renata Correia Ref20', '(11) 99999-0020', '2025-07-29 10:19:00+00', '2025-07-29 10:19:00+00'),
(gen_random_uuid(), 'André Moreira Ref21', '(11) 99999-0021', '2025-07-29 10:20:00+00', '2025-07-29 10:20:00+00'),
(gen_random_uuid(), 'Priscila Torres Ref22', '(11) 99999-0022', '2025-07-29 10:21:00+00', '2025-07-29 10:21:00+00'),
(gen_random_uuid(), 'Gustavo Ribeiro Ref23', '(11) 99999-0023', '2025-07-29 10:22:00+00', '2025-07-29 10:22:00+00'),
(gen_random_uuid(), 'Mariana Nunes Ref24', '(11) 99999-0024', '2025-07-29 10:23:00+00', '2025-07-29 10:23:00+00'),
(gen_random_uuid(), 'Felipe Lopes Ref25', '(11) 99999-0025', '2025-07-29 10:24:00+00', '2025-07-29 10:24:00+00'),
(gen_random_uuid(), 'Amanda Freitas Ref26', '(11) 99999-0026', '2025-07-29 10:25:00+00', '2025-07-29 10:25:00+00'),
(gen_random_uuid(), 'Ricardo Teixeira Ref27', '(11) 99999-0027', '2025-07-29 10:26:00+00', '2025-07-29 10:26:00+00'),
(gen_random_uuid(), 'Isabela Cunha Ref28', '(11) 99999-0028', '2025-07-29 10:27:00+00', '2025-07-29 10:27:00+00'),
(gen_random_uuid(), 'Rodrigo Campos Ref29', '(11) 99999-0029', '2025-07-29 10:28:00+00', '2025-07-29 10:28:00+00');

-- Agora vamos criar os 29 referrals para Caio Martins
-- Pegamos os IDs dos usuários recém criados e criamos os referrals
WITH new_users AS (
  SELECT id FROM profiles 
  WHERE full_name LIKE '%Ref%' 
  AND created_at >= '2025-07-29 10:00:00+00'
  ORDER BY created_at
  LIMIT 29
)
INSERT INTO affiliate_referrals (
  affiliate_id, 
  referred_user_id, 
  status, 
  created_at,
  week_start
)
SELECT 
  '8d4e29a8-b3af-48a9-b125-d7e99cfa9745'::uuid, -- ID do afiliado Caio Martins
  id,
  'participant',
  '2025-07-29 10:00:00+00'::timestamp with time zone + (ROW_NUMBER() OVER () * interval '1 minute'),
  '2025-07-28'::date
FROM new_users;