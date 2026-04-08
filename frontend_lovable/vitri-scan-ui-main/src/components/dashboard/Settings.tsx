import { Settings as SettingsIcon, User, Shield, Users, FileText, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import SignaturePad from "./SignaturePad";
import { Button } from "@/components/ui/button";

const Settings = () => {
    const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    const fetchAdminData = async () => {
        try {
            const usersRes = await fetch("http://localhost:5000/api/admin/users/pending");
            if (usersRes.ok) setPendingUsers(await usersRes.json());
            
            const logsRes = await fetch("http://localhost:5000/api/audit_logs");
            if (logsRes.ok) setAuditLogs(await logsRes.json());
        } catch (e) {
            console.error("Failed to fetch admin data", e);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                if (parsedUser.role === 'admin') {
                    fetchAdminData();
                }
            } catch (e) {
                console.error("Failed to parse user data", e);
            }
        }
    }, []);

    const handleApprove = async (email: string) => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/users/approve", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, admin_email: user?.email })
            });
            if (res.ok) fetchAdminData();
        } catch (e) { console.error(e); }
    };

    const handleReject = async (email: string) => {
        try {
            const res = await fetch("http://localhost:5000/api/admin/users/reject", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, admin_email: user?.email })
            });
            if (res.ok) fetchAdminData();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6">
            {/* App Info */}
            <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5 text-primary" />
                    Settings
                </h3>
                <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-foreground mb-1 font-medium">Application Version</p>
                        <p className="text-sm text-muted-foreground">v2.0.0 — Clinical Workflow Edition</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-foreground font-medium">User Profile</p>
                                <p className="text-xs text-muted-foreground">Currently logged in</p>
                            </div>
                        </div>

                        {user ? (
                            <div className="space-y-2 pl-1">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Name</p>
                                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Email</p>
                                    <p className="text-sm font-medium text-foreground">{user.email}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No user logged in.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Digital Signature Section */}
            <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Digital Signature
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Draw your signature below. It will be automatically embedded into all PDF reports you generate,
                    adding a layer of professional authentication to your diagnoses.
                </p>

                {user ? (
                    <SignaturePad userEmail={user.email} />
                ) : (
                    <div className="p-6 text-center bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-sm text-muted-foreground">
                            Please log in to set up your digital signature.
                        </p>
                    </div>
                )}
            </div>

            {/* Admin Section */}
            {user?.role === 'admin' && (
                <>
                    <div className="glass-strong rounded-2xl p-6 border-l-4 border-l-destructive">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-destructive" />
                            User Management (Pending Approvals)
                        </h3>
                        {pendingUsers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No pending users found.</p>
                        ) : (
                            <div className="space-y-3">
                                {pendingUsers.map(pu => (
                                    <div key={pu.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{pu.username} <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full ml-2">{pu.role}</span></p>
                                            <p className="text-xs text-muted-foreground mt-1">{pu.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => handleReject(pu.email)}>
                                                <X className="w-4 h-4 mr-1" /> Reject
                                            </Button>
                                            <Button size="sm" onClick={() => handleApprove(pu.email)}>
                                                <Check className="w-4 h-4 mr-1" /> Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="glass-strong rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            System Audit Logs
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Timestamp</th>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3">Action</th>
                                        <th className="px-4 py-3 rounded-tr-lg">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {auditLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-medium text-foreground">{log.user_email}</td>
                                            <td className="px-4 py-3 text-primary">{log.action}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{log.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Settings;
