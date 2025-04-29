//import React from 'react'
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';


async function Page() {

  const supabase = await createClient();

  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData?.user) {
    redirect('/login');
    return null; // Prevent further execution
  }
  else {
    redirect('/course-selection');
    return null; // Prevent further execution
  }

}

export default Page