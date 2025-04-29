//import React from 'react'
import { createClient } from '@/utils/supabase/server';
//import { logout } from './actions'
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

  // return (
  //   <main>
  //     <div>hello</div>
  //     <div>
  //       <button onClick={logout}>
  //         Sign Out
  //       </button>
  //     </div>
  //   </main>

  // )
}

export default Page