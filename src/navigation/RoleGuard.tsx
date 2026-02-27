import React from 'react';
import { Route, Redirect } from 'react-router-dom';

interface RoleGuardProps {
    component: React.ComponentType;
    allowedRoles: string[];
    userRole: string;
    path: string;
    exact?: boolean;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ component: Component, allowedRoles, userRole, ...rest }) => {
    return (
        <Route
            {...rest}
            render={props =>
                allowedRoles.includes(userRole) ? (
                    <Component {...props} />
                ) : (
                    <Redirect to="/unauthorized" />
                )
            }
        />
    );
};

export default RoleGuard;