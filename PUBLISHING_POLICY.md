# Publishing and review policy

This is the submission and review policy for the official Sobes plugin catalog. It describes evidence required for a release; it is not a software license, a transfer of ownership, or a replacement for [Sobes terms](https://sobes.tech/terms) and [privacy policy](https://sobes.tech/privacy).

Passing automated checks does not approve a submission. A maintainer must review the specific source revision and package hash before merging a new plugin or update. Review is not a guarantee that a plugin is free of vulnerabilities or that every use is lawful.

## Publisher and rights

- Identify the source repository and a contact for maintenance and security reports. The displayed `publisher` field is a claim, not verified identity. Maintainers must check the submitter's connection to the repository, especially for ownership or source changes.
- Provide the applicable license or permission for distributing the plugin and its assets. Public visibility on GitHub alone does not establish redistribution permission. Do not submit third-party code, branding, screenshots, recordings, or data without the required rights.
- Include the copyright and license notices required by dependencies and assets in the distributed artifact. Bundled and minified React, UI libraries, fonts, and other dependencies still need their required notices. Supply a dependency and license inventory for the reviewed build.
- Keep evidence of the applicable licenses and permissions at the submitted revision. If rights are unclear, pause the submission for clarification; do not invent a license or assume the catalog owns the code.

## Source and package evidence

- Provide reviewable source, the dependency lockfile, build instructions, and the exact source revision used to produce the package. Explain generated code and any difference between source and the submitted bundle. Unexplained obfuscation or unavailable source prevents review.
- Build a self-contained package. Do not fetch or evaluate additional executable code at runtime, disguise its purpose, bypass the sandbox, or install unrelated executables. A network permission is not approval for hidden code delivery.
- Publish the exact reviewed bytes at an immutable commit source where possible. Match the full manifest and SHA-256, including whitespace and the final newline. Run the documented local and remote checks.
- Keep a plugin ID stable and use a new, higher semantic version whenever package bytes change. Do not replace an existing release's bytes under the same version, or move a previously reviewed source tag. Metadata-only corrections must preserve the package hash and manifest.
- Review updates as code changes, including transitive dependency changes. A familiar publisher, unchanged permissions, or a passing checksum does not waive source review.

## Behavior and data access

- Request only the permissions, resource scopes, fields, and network destinations needed for the documented function. Explain wildcard destinations and broad account access; maintainers may reject unnecessary access.
- Describe what data leaves the device, its destination and purpose, and any external provider, account, API key, or payment the plugin requires. Include applicable privacy information and how a user can remove retained data. Do not describe a user-supplied key as a Sobes-funded integration.
- Do not include secrets, account credentials, private recordings, or real personal data in code, examples, screenshots, or diagnostics. Never extract host credentials or use another plugin's files or grants.
- Reject hidden collection, undisclosed telemetry, credential theft, mining, fraud, spam, destructive behavior, and attempts to evade host limits or review. A declared permission does not make these behaviors acceptable.
- Test with minimal permissions and sample data, including denied/revoked access, timeouts, cancellation, errors, updates, and uninstall behavior. Record the tested desktop version and operating system. A successful build alone does not establish runtime compatibility.

For personal data, determine the actual responsibilities of the publisher, Sobes, the user, and external recipients. An installation confirmation or technical permission prompt alone does not settle legal consent, processing agreements, security duties, or cross-border transfer requirements. Escalate unresolved questions before accepting a data-collecting plugin.

## Maintainer decision and incidents

Use the [pull request checklist](.github/pull_request_template.md) and leave the review outcome attached to the reviewed revision. Verify package/source continuity when an owner, repository, dependency, destination, permission, or resource grant changes. Recheck amended submissions before merging.

Reject submissions with unresolved security, provenance, rights, or data-disclosure problems. For suspected malicious or compromised releases, follow [SECURITY.md](SECURITY.md). Removing a catalog entry does not disable an installed copy; communicate the affected versions and concrete user actions.

Repository branch protection and required reviews are hosting settings. Maintainers must configure them so that a passing CI run alone cannot publish a catalog change. A checklist checked by its submitter is not independent approval.
