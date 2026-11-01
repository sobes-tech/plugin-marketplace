# Security reports

Report suspected malicious plugins, permission bypasses, unexpected data transfers, compromised package sources, and host vulnerabilities privately to [hellrazer822@gmail.com](mailto:hellrazer822@gmail.com), the contact listed in [Sobes terms](https://sobes.tech/terms). Use the subject **Sobes plugin security**.

Include the plugin ID and version, package SHA-256, catalog/source URL, desktop version and operating system, the observed behavior, and a minimal reproduction using your own test data. Explain which permissions were granted. Never include API keys, session tokens, private recordings, or other people's personal data. Ask for a safe transfer method before sending a suspicious executable or a sensitive attachment.

Do not post working exploits or secrets in public issues. Test only systems and data you are authorized to use. This reporting process does not authorize access to other accounts or production systems and does not promise a bounty or a response deadline.

Copyright and other rights-holder requests can use the procedure at [sobes.tech/right-holders](https://sobes.tech/right-holders).

## Maintainer response

- Record the affected plugin versions, package hashes, source revisions, granted access, and available evidence. Preserve the reviewed artifacts and relevant logs without publishing private data.
- Assess whether the issue belongs to the plugin, its source repository, the catalog, or the host. Check other versions and packages from an affected source.
- Where warranted, remove the affected catalog entry or release from discovery and tell affected users to disable or uninstall it. **Delisting does not remove or stop a copy already installed on a user's device.** Do not describe it as remote revocation.
- Handle exposed credentials and personal data through the relevant incident process. Ask the affected owner to revoke exposed credentials; do not collect them in a report.
- Publish a fixed package under a new version and hash, review it again, and provide a factual advisory with affected versions and available mitigations. Coordinate disclosure to avoid exposing users before a mitigation exists.

## What validation establishes

The catalog checks validate package metadata, supported permissions, source locations, byte limits, and checksums. They do not execute plugin behavior or certify a package as malware-free. A checksum proves that downloaded bytes match the catalog's bytes; it does not prove that those bytes are safe.

The host limits execution and mediates access, but a plugin can still misuse access the user grants it. Maintainers must follow the [publishing and review policy](PUBLISHING_POLICY.md) for new releases and updates. Custom catalogs and locally installed files do not receive this catalog's maintainer review.
