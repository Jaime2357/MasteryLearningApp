import SignupComponent from "./components/signupClient";

type SignUpParams = { userType: string};

interface PageProps {
  params: Promise<SignUpParams>
}

export default async function SignupPage({ params }: PageProps) {

    const userType = await params;

	return (

		<SignupComponent
			userType={userType.userType}
		/>

	)
}