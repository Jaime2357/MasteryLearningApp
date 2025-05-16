import MyQuestionsComponent from "./components/myQuestionsClientComponent"

type MyQuestionParams = { instructor_id: string };

interface PageProps {
  params: Promise<MyQuestionParams>
}

export default async function myQuestions({ params }: PageProps){

    const {instructor_id} = await params;

    return( <MyQuestionsComponent

        instructor_id = {instructor_id}
    /> )
}