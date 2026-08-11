# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are
currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 5.1.x   | :white_check_mark: |
| 5.0.x   | :x:                |
| 4.0.x   | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Use this section to tell people how to report a vulnerability.

Tell them where to go, how often they can expect to get an update on a
reported vulnerability, what to expect if the vulnerability is accepted or
declined, etc.
# Security Policy

## Supported Versions

Security updates are provided for the latest production version of Clinic OS.

| Version | Supported |
|---------|-----------|
| Latest production release | ✅ |
| Older releases | ⚠️ |

## Reporting a Vulnerability

Please do NOT report security vulnerabilities through public GitHub Issues.

If you discover a security vulnerability in Clinic OS, please report it privately to the project security team.

### What to Include

Please provide:

- A clear description of the vulnerability
- The affected component or endpoint
- Steps to reproduce the issue
- Potential security impact
- Proof of concept, if available
- Suggested mitigation, if known

Please do not include real patient information, passwords, API keys, or other sensitive production data in your report.

## Scope

Security reports may include issues affecting:

- Authentication
- Authorization
- Role-Based Access Control (RBAC)
- Multi-tenant isolation
- Super Admin access
- Clinic access
- Doctor and staff accounts
- Patient data
- Medical records
- Prescriptions
- Appointments
- Billing and payments
- File uploads
- API endpoints
- Session management
- Password reset
- Impersonation
- Database access
- Storage
- Webhooks
- Sensitive configuration
- Information disclosure

## Critical Multi-Tenant Security Requirement

Clinic OS is a multi-tenant platform.

A user belonging to one clinic must never be able to access data belonging to another clinic.

This includes:

- Patients
- Doctors
- Appointments
- Medical records
- Prescriptions
- Invoices
- Payments
- Files
- Reports

Tenant isolation must be enforced server-side and at the API/data-access layer.

Frontend permission checks alone are not considered sufficient security.

## Responsible Disclosure

Security researchers should:

- Avoid accessing real patient information
- Avoid modifying or deleting production data
- Avoid denial-of-service testing
- Avoid social engineering
- Avoid credential theft
- Avoid testing against users without authorization
- Use a dedicated test environment whenever possible

If sensitive data is accidentally accessed, stop testing immediately and report the issue privately.

## Secrets and Credentials

Never commit the following to the repository:

- `.env`
- Database passwords
- API keys
- Payment credentials
- Authentication secrets
- Private keys
- Access tokens
- Production credentials

Use environment variables and secure secret-management systems.

## Security Response

Security reports will be reviewed and investigated.

The response process may include:

1. Vulnerability validation
2. Severity assessment
3. Impact assessment
4. Security patch
5. Testing
6. Deployment
7. Security advisory, when appropriate

## Audit Logging

Privileged operations should be auditable.

Examples include:

- Super Admin login
- User impersonation
- Clinic suspension
- Permission changes
- Subscription changes
- Platform configuration changes
- Security configuration changes
- Sensitive data access

## Security Principles

Clinic OS follows these security principles:

- Least Privilege
- Defense in Depth
- Server-Side Authorization
- Multi-Tenant Isolation
- Secure Defaults
- Auditability
- Data Minimization
- Protection of Sensitive Information

## Contact

For private security reports, contact the project security administrator through the private contact method configured by the repository owner.

Do not disclose security vulnerabilities publicly before they have been reviewed and addressed.
