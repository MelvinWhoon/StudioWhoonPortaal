
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://hyucxlpyubfxrtqcjmtk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dWN4bHB5dWJmeHJ0cWNqbXRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYzNjU0MCwiZXhwIjoyMDg2MjEyNTQwfQ.E9WGbZsA-x4d28p3BWQA3HmWunPBnb7bo7ScQ0M3meU';

export const supabase = createClient(supabaseUrl, supabaseKey);
