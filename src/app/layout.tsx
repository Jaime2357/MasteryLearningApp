import { FC, ReactNode } from "react";
import "./globals.css";

interface Props {
    children: ReactNode;
}

const Layout: FC<Props> = (props) => {
    return <html lang="en">
        <body>
            {props.children}
        </body>
    </html>
}

export default Layout