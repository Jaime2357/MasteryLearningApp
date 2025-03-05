import React from "react"
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation';


type CourseParams = { course_id: string };

export default async function StudentDashboard({ params }: { params: CourseParams }) {

    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }

    const { data: id } = await supabase.from('students').select('student_id').eq('system_id', data.user.id).single();
    if (!id) {
        return (
            <div>
                <p> UH OH </p>
            </div>
        )
    }
    const { course_id } = await params;

    // fetch from DB
    const { data: assignments } = await supabase.from("assignments_list").select().eq('course_id', course_id).eq('open', true);
    const { data: submissions } = await supabase.from("student_submissions").select().eq('student_id', id.student_id);
    const { data: courses } = await supabase.from("courses").select().eq('course_id', course_id);

    console.log("Courses:", courses);
    console.log("Assignments:", assignments);
    console.log("Submissions", submissions)

    // Date helper functions
    function getMonth(date: Date) {
        const formattedDate = new Date(date);
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        return monthNames[formattedDate.getMonth()];
    }

    function getDay(date: Date) {
        const formattedDate = new Date(date);
        return formattedDate.getDate();
    }

    function getYear(date: Date) {
        const formattedDate = new Date(date);
        return formattedDate.getFullYear();
    }

    // Assignment Completion Helper Function
    function getPercentage(question_count: number, questions_complete: number) {
        const completion = 100 * (questions_complete / question_count);
        return completion.toFixed(2);
    }

    if (!assignments || assignments.length === 0
        || !submissions || submissions.length === 0
        || !courses || courses.length === 0) {
        return (
            <div>
                <p> hi - theres nothing here </p>
            </div>
        )
    }
    else {

        //----------------------------------Logic Below is to cover for assignments w/o submissions-----------------------------------------------------
        //---------------Our program should create a new submission for everyone in the course once as assignment is added------------------------------

        // Create two lists with students assignments that they've created submissions for
        // var countList = new Array();
        // var completionList = new Array();
        // for (let i = 0; i < assignments.length; i++){
        //     let assignmentId = assignments[i].assignment_id;
        //     let insertCount = 0;
        //     for(let j = 0; j < submissions.length; j++){
        //         if(submissions[j].assignment_id = assignmentId){
        //             completionList.push(submissions[j].questions_complete);
        //             insertCount++;
        //             break;
        //         }
        //     }
        //     if(insertCount === 1){
        //         countList.push(assignments[i].questions_count);
        //     }

        // }
        return (
            <div>
                <h1> {courses[0].course_name} </h1>
                <ul>
                    {assignments.map((assignment, index) => (
                        <li key={assignment.id || index}>
                            {assignment.assignment_name}
                            <br />
                            Completion: {getPercentage(assignment.question_count, submissions[index].questions_complete)}%
                            <br />
                            Due: {getMonth(assignment.due_date)} {getDay(assignment.due_date)}, {getYear(assignment.due_date)}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }


}