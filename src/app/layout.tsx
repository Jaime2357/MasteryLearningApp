import { FC, ReactNode } from "react";
import "./globals.css";

interface Props {
    children: ReactNode;
}

const Layout: FC<Props> = (props) => {
    return <html lang="en">
        <body className="bg-lime-50">
            {props.children}
        </body>
    </html>
}

export default Layout