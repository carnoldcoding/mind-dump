import PageHeader from "../../components/common/PageHeader";
import Desktop from "./Desktop";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const System = () => {
    const { loading: authLoading } = useAuth();

    if (authLoading) {
        return (
            <>
                <PageHeader name="SYSTEM" />
                <Loader />
            </>
        );
    }

    return (
        <>
            <PageHeader name="SYSTEM" />
            <Desktop />
        </>
    );
};

export default System;
