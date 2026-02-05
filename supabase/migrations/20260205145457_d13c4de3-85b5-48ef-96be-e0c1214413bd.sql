-- Atualizar sorteios completos que têm menos de 12 números sorteados
-- Gerar 12 números aleatórios para cada um

-- Função temporária para gerar array de 12 números únicos entre 1 e 60
CREATE OR REPLACE FUNCTION generate_12_random_numbers() 
RETURNS integer[] AS $$
DECLARE
    result integer[] := '{}';
    new_num integer;
BEGIN
    WHILE array_length(result, 1) IS NULL OR array_length(result, 1) < 12 LOOP
        new_num := floor(random() * 60 + 1)::integer;
        IF NOT (new_num = ANY(result)) THEN
            result := array_append(result, new_num);
        END IF;
    END LOOP;
    -- Ordenar o array
    SELECT array_agg(x ORDER BY x) INTO result FROM unnest(result) AS x;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Atualizar sorteios completos que têm menos de 12 números ou NULL
UPDATE raffles 
SET drawn_numbers = generate_12_random_numbers()
WHERE status = 'completed' 
AND (drawn_numbers IS NULL OR array_length(drawn_numbers, 1) < 12);

-- Remover a função temporária
DROP FUNCTION IF EXISTS generate_12_random_numbers();