import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.scss";

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo">
          Gather
        </Link>
        <nav className="header__nav">
          <Link to="/">Discover</Link>
          {user && <Link to="/dashboard">Dashboard</Link>}
          {user && <Link to="/events/new">Host an event</Link>}
        </nav>
        <div className="header__auth">
          {user ? (
            <>
              <span className="header__user">{user.name}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Join Gather
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
