# MasteryLearningApp

This app is built on Next.js with Supabase as a database/backend solution. It is also cloud hosted via Vercel. 

**Code Structure:**
- To utilize next.js's App Router built in routing, the code is organized into folders corresponding to their URI Routes.
- Within each folder is a ```page.tsx``` file, this is where the server component is stored, code that is pre-rendered server-side
- Some folders have a ```components``` folder, which typically contains client components. There are rendered client side as children of the server-side component and are used to allow for the page to update its state and trigger a rerender.
- Folders with intermediary ```[...]``` folders specify URI parameters

**Setup Instructions:**
- To run a dev build, run ```npm run dev```
- To build the project, run ```npm build```

*Note: Because Supabase uses auth keys, running a dev build requires access to supabase to get the correct keys to be stored in the .env.local file. For this reason, users outside of our project group cannot run a dev build successfully nor build the project and use it properly. To try the site for yourself, please used the deployed version: https://mastery-learning-app.vercel.app/*
  
