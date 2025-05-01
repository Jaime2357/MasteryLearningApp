//import React from 'react'
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';


async function Page() {

	const supabase = await createClient();

	const { data: userData, error: authError } = await supabase.auth.getUser();
	if (authError || !userData?.user) {
		redirect('/login');
	}
	else {
		redirect('/course-selection');
	}

}

export default Page