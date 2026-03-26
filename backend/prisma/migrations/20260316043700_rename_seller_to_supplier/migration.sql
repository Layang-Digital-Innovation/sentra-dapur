-- Rename SELLER to SUPPLIER in the Role enum
-- PostgreSQL does not support renaming enum labels directly before v14,
-- but ALTER TYPE ... RENAME VALUE is supported in PostgreSQL 10+.

-- Step 1: Add new enum value SUPPLIER if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUPPLIER'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'SUPPLIER';
  END IF;
END
$$;

-- Step 2: Update existing SELLER rows to SUPPLIER
UPDATE "User" SET "role" = 'SUPPLIER' WHERE "role" = 'SELLER';

-- Step 3: We cannot drop an enum value in PostgreSQL without recreating the type.
-- Since SELLER may still remain in the enum but no rows use it, this is acceptable.
-- If you want to fully remove SELLER, recreate the enum:
-- 1. Create a new type without SELLER
-- 2. Cast existing usages to the new type
-- 3. Drop the old type

-- For now, SELLER simply remains as an unused enum value.
