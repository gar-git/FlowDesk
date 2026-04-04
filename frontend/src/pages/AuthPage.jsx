import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import useAuth from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const loginValidationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

const signupValidationSchema = Yup.object({
  firstName: Yup.string().required("First Name is required"),
  lastName: Yup.string().required("Last Name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  employeeCode: Yup.string().required("Employee Code is required"),
  role: Yup.number().required("Role is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

function FloatingInput({
  formik,
  label,
  name,
  type = "text",
  autoComplete,
  ...rest
}) {
  return (
    <div className="form-group">
      <div className="floating-field">
        <input
          className="form-input"
          type={type}
          name={name}
          value={formik.values[name]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          autoComplete={autoComplete}
          placeholder=" "
          {...rest}
        />
        <label className="form-label">{label}</label>
      </div>
      {formik.touched[name] && formik.errors[name] && (
        <span className="field-error">{formik.errors[name]}</span>
      )}
    </div>
  );
}

export default function AuthPage({ initialTab = "login", onBack }) {
  const { userLogin, userSignup } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const switchTab = (newTab) => {
    setTab(newTab);
    setError("");
    setSuccess("");
  };

  const loginFormik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: loginValidationSchema,
    onSubmit: async (values) => {
      // debugger
      setError("");
      const res = await userLogin(values.email, values.password);
      if (res.success) {
        navigate("/dashboard", { replace: true });
      } else {
        setError(res.message || "Login failed.");
      }
    },
  });

  const signupFormik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      employeeCode: "",
      role: 3,
      password: "",
      confirmPassword: "",
    },
    validationSchema: signupValidationSchema,
    onSubmit: async (values) => {
      setError("");
      const res = await userSignup({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        employeeCode: values.employeeCode,
        roleId: Number(values.role),
        password: values.password,
      });
      if (res.success) {
        setSuccess("Account created! Redirecting to login…");
        switchTab("login");
      } else {
        setError(res.message || "Signup failed.");
      }
    },
  });

  const testimonials = {
    login: {
      text: '"FlowDesk changed how we run sprints. The hierarchy-aware views mean I never have to chase updates anymore."',
      name: "Priya Sharma",
      role: "Engineering Manager, Razorpay",
      color: "#6c63ff",
      initial: "P",
    },
    signup: {
      text: '"The task forwarding feature alone saved us hours of meetings. My team loves the clean interface."',
      name: "Rahul Mehta",
      role: "Tech Lead, Zepto",
      color: "#00d4ff",
      initial: "R",
    },
  };

  const t = testimonials[tab];

  return (
    <div className="auth-page">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="auth-left-decoration">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-left-content">
          <div className="auth-left-logo" onClick={onBack}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="logo-icon">F</div>
              <span className="logo-text">
                Flow<span>Desk</span>
              </span>
            </div>
          </div>

          <h2 className="auth-left-tagline">
            Manage tasks
            <br />
            the way your{" "}
            <span className="gradient-text">team actually works</span>
          </h2>

          <p className="auth-left-desc">
            The only task tracker built around your org hierarchy. Assign,
            track, and delegate — with real-time notifications and full
            visibility at every level.
          </p>

          <div className="auth-testimonial">
            <p className="auth-testimonial-text">{t.text}</p>
            <div className="auth-testimonial-author">
              <div className="author-avatar" style={{ background: t.color }}>
                {t.initial}
              </div>
              <div className="author-info">
                <p className="author-name">{t.name}</p>
                <p className="author-role">{t.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Back link */}
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: 13,
              marginBottom: 32,
              transition: "var(--transition)",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            ← Back to home
          </button>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === "login" ? " active" : ""}`}
              onClick={() => switchTab("login")}
            >
              Log In
            </button>
            <button
              className={`auth-tab${tab === "signup" ? " active" : ""}`}
              onClick={() => switchTab("signup")}
            >
              Sign Up
            </button>
          </div>

          {/* Messages */}
          {error && <div className="error-msg">⚠ {error}</div>}
          {success && <div className="success-msg">✓ {success}</div>}

          {/* ===== LOGIN FORM ===== */}
          {tab === "login" && (
            <>
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-subtitle">
                Log in to your FlowDesk workspace
              </p>

              <form onSubmit={loginFormik.handleSubmit}>
                <FloatingInput
                  formik={loginFormik}
                  label="Work Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                />

                <div className="form-group password-wrapper">
                  <div className="floating-field">
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={loginFormik.values.password}
                      onChange={loginFormik.handleChange}
                      onBlur={loginFormik.handleBlur}
                      autoComplete="current-password"
                      placeholder=" "
                    />
                    <label className="form-label">Password</label>
                  </div>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                  {loginFormik.touched.password &&
                    loginFormik.errors.password && (
                      <span className="field-error">
                        {loginFormik.errors.password}
                      </span>
                    )}
                </div>

                <div className="form-footer">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="forgot-link">
                    Forgot password?
                  </button>
                </div>

                <button type="submit" className="btn-submit">
                  Log in to FlowDesk
                </button>
              </form>

              <p className="auth-switch">
                Don't have an account?{" "}
                <button onClick={() => switchTab("signup")}>
                  Sign up free
                </button>
              </p>
            </>
          )}

          {/* ===== SIGNUP FORM ===== */}
          {tab === "signup" && (
            <>
              <h2 className="auth-form-title">Create your account</h2>
              <p className="auth-form-subtitle">
                Join your team's FlowDesk workspace
              </p>

              <form onSubmit={signupFormik.handleSubmit}>
                <div className="form-row">
                  <FloatingInput
                    formik={signupFormik}
                    label="First Name"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                  />
                  <FloatingInput
                    formik={signupFormik}
                    label="Last Name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                  />
                </div>

                <FloatingInput
                  formik={signupFormik}
                  label="Work Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                />

                {/* <div className="form-row">
                  <FloatingInput
                    formik={signupFormik}
                    label="Employee Code"
                    name="employeeCode"
                    type="text"
                  />
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      name="role"
                      value={signupFormik.values.role}
                      onChange={signupFormik.handleChange}
                      onBlur={signupFormik.handleBlur}
                    >
                      <option value={3}>Developer (SDE)</option>
                      <option value={2}>Tech Lead</option>
                      <option value={1}>Manager</option>
                    </select>
                  </div>
                </div> */}

                <div className="form-row">
                  <FloatingInput
                    formik={signupFormik}
                    label="Employee Code"
                    name="employeeCode"
                    type="text"
                  />
                  <div className="form-group">
                    <select
                      className="form-select role-style-select"
                      name="role"
                      value={signupFormik.values.role}
                      onChange={signupFormik.handleChange}
                      onBlur={signupFormik.handleBlur}
                    >
                      <option value="" disabled>
                        Role
                      </option>
                      <option value={3}>Developer (SDE)</option>
                      <option value={2}>Tech Lead</option>
                      <option value={1}>Manager</option>
                    </select>
                  </div>
                </div>

                <div className="form-group password-wrapper">
                  <div className="floating-field">
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={signupFormik.values.password}
                      onChange={signupFormik.handleChange}
                      onBlur={signupFormik.handleBlur}
                      autoComplete="new-password"
                      placeholder=" "
                    />
                    <label className="form-label">Password</label>
                  </div>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                  {signupFormik.touched.password &&
                    signupFormik.errors.password && (
                      <span className="field-error">
                        {signupFormik.errors.password}
                      </span>
                    )}
                </div>

                <div className="form-group password-wrapper">
                  <div className="floating-field">
                    <input
                      className="form-input"
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={signupFormik.values.confirmPassword}
                      onChange={signupFormik.handleChange}
                      onBlur={signupFormik.handleBlur}
                      autoComplete="new-password"
                      placeholder=" "
                    />
                    <label className="form-label">Confirm Password</label>
                  </div>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((p) => !p)}
                    tabIndex={-1}
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                  {signupFormik.touched.confirmPassword &&
                    signupFormik.errors.confirmPassword && (
                      <span className="field-error">
                        {signupFormik.errors.confirmPassword}
                      </span>
                    )}
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  style={{ marginTop: 8 }}
                >
                  Create Account →
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{" "}
                <button onClick={() => switchTab("login")}>Log in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
