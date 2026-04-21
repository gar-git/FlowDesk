import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { createCompany } from "../api/companies";
import { StatusCode } from "../utils/constants";

const validationSchema = Yup.object({
  companyName: Yup.string().required("Company name is required"),
  adminFirstName: Yup.string().required("First name is required"),
  adminLastName: Yup.string().required("Last name is required"),
  adminEmail: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  adminEmployeeCode: Yup.string().required("Employee code is required"),
  adminPassword: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("adminPassword")], "Passwords do not match")
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

export default function CreateCompanyPage({ onBack }) {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const formik = useFormik({
    initialValues: {
      companyName: "",
      adminFirstName: "",
      adminLastName: "",
      adminEmail: "",
      adminEmployeeCode: "",
      adminPassword: "",
      confirmPassword: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setError("");
      setSubmitting(true);
      try {
        const response = await createCompany({
          companyName: values.companyName.trim(),
          adminFirstName: values.adminFirstName.trim(),
          adminLastName: values.adminLastName.trim(),
          adminEmail: values.adminEmail.trim(),
          adminPassword: values.adminPassword,
          adminEmployeeCode: values.adminEmployeeCode.trim(),
        });

        if (response?.data?.statusCode === StatusCode.created) {
          const { token, companyCode: code } = response.data.data;
          const sessionOk = await loginWithToken(token);
          if (sessionOk.success && code) {
            setCompanyCode(code);
          } else if (!sessionOk.success) {
            setError(sessionOk.message || "Could not sign you in.");
          }
        } else {
          const msg =
            response?.data?.message ||
            response?.message ||
            "Could not create company.";
          setError(msg);
        }
      } finally {
        setSubmitting(false);
      }
    },
  });

  const copyCode = async () => {
    if (!companyCode) return;
    try {
      await navigator.clipboard.writeText(companyCode);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  };

  const goDashboard = () => navigate("/dashboard", { replace: true });

  return (
    <div className="auth-page">
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
            Start your
            <br />
            <span className="gradient-text">organization workspace</span>
          </h2>

          <p className="auth-left-desc">
            Create your company once. You become the admin, get a unique
            company code, and your team uses that code when they sign up.
          </p>

          <div className="auth-testimonial">
            <p className="auth-testimonial-text">
              &quot;We spun up FlowDesk in minutes. Sharing the company code with
              the team was the easiest onboarding we&apos;ve done.&quot;
            </p>
            <div className="auth-testimonial-author">
              <div
                className="author-avatar"
                style={{ background: "#6c63ff" }}
              >
                A
              </div>
              <div className="author-info">
                <p className="author-name">Ananya Iyer</p>
                <p className="author-role">Head of Engineering, Series B startup</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container" style={{ maxWidth: 420 }}>
          <button
            type="button"
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

          {!companyCode ? (
            <>
              <h2 className="auth-form-title">Create your company</h2>
              <p className="auth-form-subtitle">
                You&apos;ll be the admin. We&apos;ll generate a company code for
                your team.
              </p>

              {error && <div className="error-msg">⚠ {error}</div>}

              <form onSubmit={formik.handleSubmit}>
                <p className="auth-section-label">Organization</p>
                <FloatingInput
                  formik={formik}
                  label="Company name"
                  name="companyName"
                  type="text"
                  autoComplete="organization"
                />

                <p className="auth-section-label">Admin account</p>
                <div className="form-row">
                  <FloatingInput
                    formik={formik}
                    label="First name"
                    name="adminFirstName"
                    type="text"
                    autoComplete="given-name"
                  />
                  <FloatingInput
                    formik={formik}
                    label="Last name"
                    name="adminLastName"
                    type="text"
                    autoComplete="family-name"
                  />
                </div>

                <FloatingInput
                  formik={formik}
                  label="Work email"
                  name="adminEmail"
                  type="email"
                  autoComplete="email"
                />

                <FloatingInput
                  formik={formik}
                  label="Employee code"
                  name="adminEmployeeCode"
                  type="text"
                  autoComplete="off"
                />

                <div className="form-group password-wrapper">
                  <div className="floating-field">
                    <input
                      className="form-input"
                      type={showPassword ? "text" : "password"}
                      name="adminPassword"
                      value={formik.values.adminPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
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
                  {formik.touched.adminPassword &&
                    formik.errors.adminPassword && (
                      <span className="field-error">
                        {formik.errors.adminPassword}
                      </span>
                    )}
                </div>

                <div className="form-group password-wrapper">
                  <div className="floating-field">
                    <input
                      className="form-input"
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={formik.values.confirmPassword}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      autoComplete="new-password"
                      placeholder=" "
                    />
                    <label className="form-label">Confirm password</label>
                  </div>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirm((p) => !p)}
                    tabIndex={-1}
                  >
                    {showConfirm ? "🙈" : "👁️"}
                  </button>
                  {formik.touched.confirmPassword &&
                    formik.errors.confirmPassword && (
                      <span className="field-error">
                        {formik.errors.confirmPassword}
                      </span>
                    )}
                </div>

                <button
                  type="submit"
                  className="btn-submit"
                  style={{ marginTop: 8 }}
                  disabled={submitting}
                >
                  {submitting ? "Creating…" : "Create company & continue →"}
                </button>
              </form>

              <p className="auth-switch">
                Joining an existing team?{" "}
                <button type="button" onClick={() => navigate("/signup")}>
                  Sign up with a code
                </button>
              </p>
              <p className="auth-switch" style={{ marginTop: 8 }}>
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/login")}>
                  Log in
                </button>
              </p>
            </>
          ) : (
            <>
              <h2 className="auth-form-title">You&apos;re all set</h2>
              <p className="auth-form-subtitle">
                Share this code with teammates when they sign up. You can find it
                later in your workspace.
              </p>

              <div className="success-msg" style={{ marginBottom: 20 }}>
                ✓ Company created and you&apos;re signed in as admin.
              </div>

              <p className="auth-section-label" style={{ marginTop: 0 }}>
                Your company code
              </p>
              <div className="company-code-display">
                <code>{companyCode}</code>
                <button
                  type="button"
                  className="btn-copy-code"
                  onClick={copyCode}
                >
                  {copyDone ? "Copied" : "Copy"}
                </button>
              </div>

              <button
                type="button"
                className="btn-submit"
                onClick={goDashboard}
              >
                Go to dashboard →
              </button>

              <p className="auth-switch">
                Need to add someone?{" "}
                <button type="button" onClick={() => navigate("/signup")}>
                  Share the signup link
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
