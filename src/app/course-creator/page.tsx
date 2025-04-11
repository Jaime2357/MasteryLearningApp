
import { createClient } from "@/utils/supabase/server";
import CourseCreatorComponent from "./components/courseCreatorClient";
import { redirect } from "next/navigation";

export default async function CourseCreator() {

    const supabase = await createClient();
    
        // Authenticate user
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData?.user) {
            redirect('/login');
        }
    
        const {data: instructor, error: idError} = await supabase
        .from('instructors')
        .select('instructor_id')
        .eq('system_id', userData.user.id)
        .single();
    
        if(idError || !instructor){
            console.error("Access Denied: ", idError.message);
            return
        }

        return(
            <CourseCreatorComponent
            instructor_id={instructor.instructor_id}
            />
        )
}