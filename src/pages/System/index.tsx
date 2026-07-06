import { Navigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Desktop from "./Desktop";
import { useTrustedDevice } from "../../context/TrustedDeviceContext";
import Loader from "../../components/common/Loader";

const System = () => {
    const { trusted, loading } = useTrustedDevice();

    if (loading) {
        return (
            <>
                <PageHeader name="SYSTEM" />
                <Loader />
            </>
        );
    }

    if (!trusted) {
        return <Navigate to="/" replace />;
    }

    return (
        <>
            <PageHeader name="SYSTEM" />
            <Desktop />
        </>
    );
};

export default System;
