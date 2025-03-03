import React from "react"

import { createClient } from '@/utils/supabase/server'


export default async function Page() {

    // Hardcoded Test Values for Student and Course IDs
    const id = '01234567'; //We might have to process student and instuctor IDs as strings since DBS and ts don't like leading zeroes
    const courseid = '21667';

    // fetch from DB
    const supabase = await createClient();
    const { data: assignments } = await supabase.from("assignments_list").select().eq('course_id', courseid).eq('open', true);
    const { data: submissions } = await supabase.from("student_submissions").select().eq('student_id', id);
    const { data: courses } = await supabase.from("courses").select().eq('course_id', courseid);

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