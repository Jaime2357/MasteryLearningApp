'use client'

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/react-aria";
import { logout } from "@/app/actions";
import { ChevronLeft } from "lucide-react";

type Course = {
    course_id: string;
    course_name: string;
    catalog_code: string;
    course_description: string;
}
interface ClientComponentProps {
    instructor_id: string;
    course_id: string;
    course: Course;
}

const CourseEditorComponent: React.FC<ClientComponentProps> = ({ instructor_id, course_id, course }) => {
    const supabase = createClient();
    const router = useRouter();

    const [courseName, setCourseName] = useState<string>('');
    const [catalogCode, setCatalogCode] = useState<string>('');
    const [duplicated, setDuplicated] = useState<boolean[]>([false, false, false]);
    // 0: Id, 1: Name, 2: Code
    const [courseDescription, setCourseDescription] = useState<string>('')

    useEffect(() => {
    }, [duplicated])

    async function check(val: string, checkNo: number) {
        let check = 'course_name';
        if (checkNo === 1) {
            setCourseName(val);
            if (val === course.course_name) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
                return;
            }
        }
        if (checkNo === 2) {
            setCatalogCode(val)
            check = 'catalog_code';
            if (val === course.catalog_code) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
                return;
            }
        }

        const { data: retrieved, error: RetrievalError } = await supabase
            .from('courses')
            .select()
            .eq(check, val);

        if (RetrievalError) {
            console.error('Problem checking for duplicates: ', RetrievalError.message);
        }
        else {
            if (retrieved.length > 0) {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = true;
                    return newDupes;
                })
            }
            else {
                setDuplicated(prev => {
                    const newDupes = [...prev];
                    newDupes[checkNo] = false;
                    return newDupes;
                })
            }
        }
    }

    async function updateCourse() {

        let insertedName = courseName;
        let insertedCode = catalogCode;
        let insertedDescription = courseDescription;

        if (courseName === '') { insertedName = course.course_name }
        if (catalogCode === '') { insertedCode = course.catalog_code }
        if (courseDescription === '') { insertedDescription = course.course_description }

        const newCourseData = {
            course_id: course_id,
            course_name: insertedName,
            catalog_code: insertedCode,
            course_description: insertedDescription,
            instructor_id: instructor_id
        }

        console.log('Updated Data: ', newCourseData)

        const { error: courseUpdateError } = await supabase
            .from('courses')
            .update([newCourseData])
            .eq('course_id', course_id);

        if (courseUpdateError) {
            console.error("Problem Updating Course: ", courseUpdateError.message);
        }
        else {
            alert("Course Updated Sucessfully");
            router.push(`/instructor-dashboard/${course_id}`);
        }
    }

    async function deleteCourse() {

        const { error: deletionError } = await supabase
            .from('courses')
            .delete()
            .eq('course_id', course_id);

        if (deletionError) {
            console.error("Problem Deleting Course: ", deletionError.message)
            return null;
        }
        else {
            alert('Course Deleted Successfully')
            router.push(`/course-selection`);
        }

    }

    return (
        <>
            {/* Navbar */}
            <header className="px-8 pt-6 pb-4 border-b bg-lime-300">
                <nav className="grid grid-cols-4">
                    <Link href="/" className="col-start-2 col-end-4 text-center text-xl font-mono font-bold">Mastery Learning</Link>
                    <Button onPress={logout} className="justify-self-end cursor-pointer text-sm hover:underline focus-visible:underline outline-none">
                        Sign Out
                    </Button>
                </nav>
            </header>

            {/* Back to Dashboard */}
            <Link href={`/instructor-dashboard/${course_id}`} className="block w-fit mt-6 ml-6 outline-none text-gray-600 group">
                <ChevronLeft className="inline" strokeWidth={1} />
                <span className="align-middle group-hover:underline group-focus-visible:underline">Return to Submissions</span>
            </Link>

            <main className="max-w-xl mx-auto mt-8 px-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow p-8">
                    <h1 className="font-mono font-bold text-2xl mb-6 text-lime-700">
                        Edit Course
                    </h1>

                    {/* Course Name */}
                    <div className="mb-6">
                        <label className="block font-semibold mb-1">Course Name</label>
                        <div className="text-gray-500 text-sm mb-1">
                            Current: <span className="font-mono">{course.course_name}</span>
                        </div>
                        <input
                            type="text"
                            value={courseName}
                            onChange={e => check(e.target.value, 1)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter new course name"
                        />
                        {duplicated[1] && (
                            <p className="text-red-500 text-sm mt-1">
                                This course name is in use by another course.
                            </p>
                        )}
                    </div>

                    {/* Catalog Code */}
                    <div className="mb-6">
                        <label className="block font-semibold mb-1">Catalog Code</label>
                        <div className="text-gray-500 text-sm mb-1">
                            Current: <span className="font-mono">{course.catalog_code}</span>
                        </div>
                        <input
                            type="text"
                            value={catalogCode}
                            onChange={e => check(e.target.value, 2)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter new catalog code"
                        />
                        {duplicated[2] && (
                            <p className="text-red-500 text-sm mt-1">
                                This catalog code is in use by another course.
                            </p>
                        )}
                    </div>

                    {/* Course Description */}
                    <div className="mb-8">
                        <label className="block font-semibold mb-1">Course Description</label>
                        <div className="text-gray-500 text-sm mb-1">
                            Current: <span className="font-mono">{course.course_description}</span>
                        </div>
                        <input
                            type="text"
                            value={courseDescription}
                            onChange={e => setCourseDescription(e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                            placeholder="Enter new course description"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        {(duplicated.every(element => element === false) &&
                            (courseName !== '' || catalogCode !== '')) && (
                                <button
                                    onClick={updateCourse}
                                    className="bg-lime-300 hover:bg-lime-400 text-gray-900 font-semibold rounded px-4 py-2 shadow transition"
                                >
                                    Update Course
                                </button>
                            )}
                        <button
                            onClick={deleteCourse}
                            className="bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded px-4 py-2 shadow transition"
                        >
                            Delete Course
                        </button>
                    </div>
                </div>
            </main>
        </>
    )
}

export default CourseEditorComponent;