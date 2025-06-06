"use server"

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: userData, error: loginError } = await supabase.auth.signInWithPassword(data)

  console.log(userData)

  if(!userData.user){
    console.log('Please double check your email/password. Please also check that you have verified your email');
  }

   if (loginError) {
    // Redirect with error message as a search param
    redirect(`/login?error=${encodeURIComponent("Invalid email or password")}`);
  }

  revalidatePath('/', 'layout')
  redirect('/')
}