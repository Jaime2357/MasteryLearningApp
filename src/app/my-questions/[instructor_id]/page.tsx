import MyQuestionsComponent from "./components/myQuestionsClientComponent"

type MyQuestionParams = { instructor_id: string };

export default async function myQuestions({ params }: { params: MyQuestionParams}){

    const {instructor_id} = await params;

    return( <MyQuestionsComponent

        instructor_id = {instructor_id}
    /> )
}