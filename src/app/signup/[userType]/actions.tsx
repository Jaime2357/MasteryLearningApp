"use server"

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function createStudent(formData: FormData) {

    const supabase = await createClient();

    const loginData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string
    }

    const { data: signupReturn, error: signupError } = await supabase.auth.signUp(loginData);

    if (signupError) {
        console.error("Error creating user: ", signupError.message)
        return null;
    }
    else {
        const studentData = {
            student_id: formData.get('id') as string,
            system_id: signupReturn.user?.id,
            first_name: formData.get('fname') as string,
            last_name: formData.get('lname') as string
        }

        const { error: insertionError } = await supabase.from('students').insert(studentData)

        if (insertionError) {
            console.error("Error inserting student data: ", insertionError.message)
            return null;
        }
        else {
            redirect('/');
        }
    }
}

export async function createInstructor(formData: FormData) {

    const supabase = await createClient();

    const loginData = {
        email: formData.get('email') as string,
        password: formData.get('password') as string
    }

    const { data: signupReturn, error: signupError } = await supabase.auth.signUp(loginData);
    console.log()

    if (signupError) {
        console.error("Error creating user: ", signupError.message)
        return null;
    }
    else {
        const instructorData = {
            instructor_id: formData.get('id') as string,
            system_id: signupReturn.user?.id,
            first_name: formData.get('fname') as string,
            last_name: formData.get('lname') as string
        }

        const { error: insertionError } = await supabase.from('instructors').insert(instructorData)

        if (insertionError) {
            console.error("Error inserting instructor data: ", insertionError.message)
            return null;
        }
        else {
            redirect('/');
        }
    }
}


