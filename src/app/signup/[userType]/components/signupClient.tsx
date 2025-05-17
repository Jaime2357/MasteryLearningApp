'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Form, Input, Label, TextField, Button } from "@/components/react-aria"
import Link from "next/link"
import { createInstructor, createStudent } from "../actions"

interface ClientComponentProps {
    userType: string
}

const SignupComponent: React.FC<ClientComponentProps> = ({ userType }) => {
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    let typeName: string;

    if (userType === 'student') {
            typeName = 'Student'
        }
        else {
            typeName = 'Instructor'
        }


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        const formData = new FormData(e.currentTarget)
        let result
        if (typeName === 'Student') {
            result = await createStudent(formData)
        }
        else {
            result = await createInstructor(formData)
        }

        console.log(result.error)
        if (result.error) {
            setError("Problem Signing You Up")
            
        } else {
            alert("Registration Successful, please check your email to verify your account!")
            router.push("/")
        }
    }

    return (
        <>
            <main className="flex h-screen bg-lime-50">
                <div className="m-auto px-16 py-20 rounded-xl border bg-white">
                    <h1 className="text-3xl font-mono font-bold">Mastery Learning</h1>
                    <Form onSubmit={handleSubmit} className="mt-12">
                        <TextField type="email" name="email">
                            <Label className="text-sm">Email</Label>
                            <Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
                        </TextField>
                        <TextField type="password" name="password">
                            <Label className="text-sm">Password</Label>
                            <Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
                        </TextField>
                        <TextField type="text" name="id">
                            <Label className="text-sm">{typeName} ID </Label>
                            <Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
                        </TextField>
                        <TextField type="text" name="fname">
                            <Label className="text-sm">First Name</Label>
                            <Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
                        </TextField>
                        <TextField type="text" name="lname">
                            <Label className="text-sm">Last Name</Label>
                            <Input className="w-full border pl-3 py-1 mt-1 rounded-lg outline-lime-300 focus:outline-2 bg-gray-200" />
                        </TextField>
                        <Button type="submit" className="w-full border rounded-lg p-2 mt-8 cursor-pointer bg-lime-50 transition ease-in-out hover:scale-105 active:bg-gray-300 outline-lime-300 focus-visible:outline-2">
                            Signup
                        </Button>
                        <Link
                            href="/login"
                            className="block text-center w-full border rounded-lg p-2 mt-4 cursor-pointer bg-lime-300 transition ease-in-out hover:scale-110 active:bg-gray-300 outline-lime-300 focus-visible:outline-2"
                        >
                            Login
                        </Link>
                        {error && <div className="mt-4 text-red-600">{error}</div>}
                    </Form>
                </div>
            </main>
        </>
    )
}

export default SignupComponent
