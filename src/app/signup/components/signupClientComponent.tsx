'use client'

import { createClient } from "@/utils/supabase/client";
import { redirect } from "next/navigation";
import { useState } from "react";

const SignUpComponent = () => {

    const supabase = createClient();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [userType, setType] = useState('');
    const [student, setStudent] = useState(true);
    const [id, setId] = useState('');
    const [fname, setFname] = useState('');
    const [lname, setLname] = useState('');

    const typeSet = (val: string) => { // Pls implement a dropdown menu to select student or instructor
        setType(val)

        if (val === 'student') {
            setStudent(true);
        }
        if (val === 'instructor') {
            setStudent(false);
        }
    }

    async function createStudent() {

        const data = {
            email: email,
            password: password,
        }

        const { data: userData, error } = await supabase.auth.signUp(data);

        if (error) {
            console.error("Error creating user: ", error.message)
            return null;
        }
        else {
            const studentData = {
                student_id: id,
                system_id: userData.user?.id,
                first_name: fname,
                last_name: lname
            }

            const { error: insertionError } = await supabase.from('students').insert(studentData)

            if (insertionError) {
                console.error("Error inserting student data: ", insertionError.message)
                return null;
            }
            else {
                alert("Sign Up Successful, Please verify your email before logging in")
                redirect('/');
            }
        }
    }

    async function createInstructor() {

        const data = {
            email: email,
            password: password,
        }

        const { data: userData, error } = await supabase.auth.signUp(data);

        if (error) {
            console.error("Error creating user: ", error.message)
            return null;
        }
        else {
            const instructorData = {
                instructor_id: id,
                system_id: userData.user?.id,
                first_name: fname,
                last_name: lname
            }

            const { error: insertionError } = await supabase.from('instructors').insert(instructorData)

            if (insertionError) {
                console.error("Error inserting instructor data: ", insertionError.message)
                return null;
            }
            else {
                alert("Sign Up Successful, Please verify your email before logging in")
                redirect('/');
            }
        }
    }

    return (
        <div>
            <label>
                Email:
                <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </label>
            <label>
                Password:
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </label>

            <label>
                User type:
                <input
                    type="text"
                    value={userType}
                    onChange={(e) => typeSet(e.target.value)}
                />
            </label>


            <label>
                {(student) &&
                    <p> Student Id: </p>
                }
                {(!student) &&
                    <p> Instructor Id: </p>
                }
                <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                />
            </label>

            <label>
                First Name:
                <input
                    type="text"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                />
            </label>
            <label>
                Last Name:
                <input
                    type="text"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                />
            </label>

            <button onClick={() => {
                if (student) {
                    createStudent();
                }
                else {
                    createInstructor();
                }
            }}> Submit </button>
        </div>
    )
}

export default SignUpComponent;