import { createClient } from '@/utils/supabase/server'

export default async function Instruments() {
  const supabase = await createClient();
  const { data: assignmentList } = await supabase.from("assignments_list").select();

  return <pre>{JSON.stringify(assignmentList, null, 2)}</pre>
}