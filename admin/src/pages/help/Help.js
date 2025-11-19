import React, { useState, useEffect, useRef } from "react";
import {
    HelpCircle,
    Navigation,
    Users,
    ShieldCheck,
    Settings as SettingsIcon,
    BookOpen,
    Gavel,
    MessageSquareWarning,
    ListChecks,
    Search,
} from "lucide-react";

const Section = ({ title, icon: Icon, children, query = "" }) => (
    <section className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 px-5 pt-5">
            {Icon ? (
                <div className="h-9 w-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "#023D7B14", color: "#023D7B" }}>
                    <Icon size={18} />
                </div>
            ) : null}
            <h2 className="text-base font-semibold text-gray-900"><Highlight text={title} query={query} /></h2>
        </div>
        <div className="px-5 pb-5 pt-4 text-sm text-gray-700 space-y-3">
            {children}
        </div>
    </section>
);

// Highlight component wraps matching query text in <mark>
const Highlight = ({ text = "", query = "" }) => {
    if (!query || typeof text !== "string") return <>{text}</>;
    const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${safe})`, "gi"));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-yellow-100 rounded px-0.5">{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};

const Item = ({ title, keywords = "", query = "", children }) => {
    return (
        <div className="group p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors">
            <p className="font-medium text-gray-900">
                <Highlight text={title} query={query} />
            </p>
            <div className="text-gray-700 mt-1 leading-relaxed">
                {typeof children === "string" ? (
                    <Highlight text={children} query={query} />
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default function Help() {
    const [query, setQuery] = useState("");
    const rootRef = useRef(null);

    useEffect(() => {
        if (!query) return;
        const container = rootRef.current;
        if (!container) return;
        const firstMark = container.querySelector("mark");
        if (firstMark) {
            firstMark.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [query]);

    return (
        <div ref={rootRef} className="w-full mx-auto px-4 sm:px-6 py-4 sm:py-6">
            {/* Hero */}
            <div className="mb-6 sm:mb-8 rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#023D7B14", color: "#023D7B" }}>
                            <HelpCircle size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
                            <p className="text-gray-600 mt-1 text-sm">
                                This guide covers the admin-side features of AI.ttorney. Use the left sidebar to
                                navigate modules. Some actions are available only to <span className="font-medium" style={{ color: "#023D7B" }}>Super Admins</span>.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">Getting around</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">User management</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">Moderation</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">Resources</span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">Settings</span>
                </div>
            </div>

            <div className="w-full mb-4 sm:mb-6">
                <div className="relative" role="search">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Quick search in help..."
                        aria-label="Quick search in help"
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Section title="Navigation & Layout" icon={Navigation} query={query}>
                    <Item title="Sidebar" query={query} keywords="dashboard users moderation admin legal resources forum settings help active highlight">
                        Use the sidebar to access Dashboard, Users, Moderation, Admin, Legal Resources, Forum, Settings, and Help. The active item is highlighted.
                    </Item>
                    <Item title="Header" query={query} keywords="account info quick actions page title session role access routes">
                        Shows your account info, quick actions, and page title. Session and role-based access apply to all routes.
                    </Item>
                </Section>

                <Section title="Users Management" icon={Users} query={query}>
                    <Item title="Legal Seekers" query={query} keywords="view filter manage seekers kebab view edit suspend archive">
                        View, filter, and manage legal seekers. Use the kebab menu for actions like View, Edit, Suspend/Archive where applicable.
                    </Item>
                    <Item title="Lawyers" query={query} keywords="profiles statuses view modal details kebab actions">
                        Review lawyer profiles and statuses. Open the View modal for compact details. Use the kebab menu for actions.
                    </Item>
                    <Item title="Lawyer Applications" query={query} keywords="applications verify documents approve decline update status review guidelines">
                        Process applications. Verify documents, approve/decline, and update status. Ensure compliance with review guidelines.
                    </Item>
                </Section>

                <Section title="Moderation" icon={Gavel} query={query}>
                    <Item title="Appeals" query={query} keywords="appeals suspensions restrictions review context audit logs uphold lift">
                        Handle user appeals from suspensions or restrictions. Review context, audit logs, and decide to uphold or lift actions.
                    </Item>
                    <Item title="Ban/Restrict Users" query={query} keywords="ban restrict temporary violations policy auditing logs">
                        Apply temporary restrictions or bans when policy violations occur. Actions are logged for auditing.
                    </Item>
                </Section>

                <Section title="Admin Tools" icon={ShieldCheck} query={query}>
                    <Item title="Manage Admins (Super Admin only)" query={query} keywords="create edit suspend archive admin accounts roles super admin">
                        Create, edit, suspend, or archive admin accounts. Assign roles such as Admin or Super Admin. Access is restricted by role.
                    </Item>
                    <Item title="Audit Logs" query={query} keywords="system activity logs accountability filter user action date">
                        View system-wide activity logs for accountability. Filter by user, action, or date.
                    </Item>
                </Section>

                <Section title="Legal Resources" icon={BookOpen} query={query}>
                    <Item title="Glossary Terms" query={query} keywords="terms add edit retire definitions">
                        Maintain a curated list of legal terms. Add, edit, and retire terms.
                    </Item>
                    <Item title="Legal Articles" query={query} keywords="knowledge base articles draft publish archive">
                        Manage knowledge-base articles. Draft, publish, and archive content.
                    </Item>
                </Section>

                <Section title="Forum Moderation" icon={MessageSquareWarning} query={query}>
                    <Item title="Topics & Threads" query={query} keywords="categories threads moderate posts structure">
                        Organize categories and threads. Moderate posts and structure discussions.
                    </Item>
                    <Item title="Reports" query={query} keywords="reported posts replies dismiss warn restrict remove">
                        Review reported posts and replies. Take actions such as dismiss, warn, restrict, or remove content.
                    </Item>
                </Section>

                <Section title="Settings" icon={SettingsIcon} query={query}>
                    <Item title="Profile Management" query={query} keywords="first name last name email read only joined date change password policy">
                        Update your first and last name. Email is read-only. Joined Date is sourced from the users table. Change password with current-password verification and policy checks.
                    </Item>
                </Section>

                <Section title="Tips & Troubleshooting" icon={ListChecks} query={query}>
                    <Item title="Permissions" query={query} keywords="access page action confirm role super admin">
                        If you cannot access a page or action, confirm your role with a Super Admin.
                    </Item>
                    <Item title="Session & Auth" query={query} keywords="session auth refresh re-login data not updating">
                        If data doesn't reflect recent changes, refresh your session from Settings or re-login.
                    </Item>
                    <Item title="Toasts & Confirmation Modals" query={query} keywords="toasts feedback confirmation modals sensitive actions">
                        The system uses toasts for feedback and modals for confirmation on sensitive actions—read messages carefully.
                    </Item>
                </Section>
            </div>

            <div className="mt-6 text-xs text-gray-500">Need more help? Contact your system administrator or refer to internal SOPs.</div>
        </div>
    );
}
