#!/usr/bin/env bash
set -euo pipefail

REPO="darylcecile/gh-doccy"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="gh-doccy"

# Detect OS
case "$(uname -s)" in
  Linux*)  OS="linux" ;;
  Darwin*) OS="darwin" ;;
  *)
    echo "Error: Unsupported operating system '$(uname -s)'"
    echo "gh-doccy supports Linux and macOS only."
    exit 1
    ;;
esac

# Detect architecture
case "$(uname -m)" in
  x86_64|amd64) ARCH="amd64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *)
    echo "Error: Unsupported architecture '$(uname -m)'"
    exit 1
    ;;
esac

ARTIFACT="gh-doccy-${OS}-${ARCH}"

# Determine version to install
if [ -n "${1:-}" ]; then
  VERSION="$1"
else
  echo "Fetching latest release..."
  VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')

  if [ -z "$VERSION" ]; then
    echo "Error: Could not determine latest version."
    echo "Check https://github.com/${REPO}/releases for available versions."
    exit 1
  fi
fi

DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARTIFACT}"

echo "Installing gh-doccy ${VERSION} (${OS}/${ARCH})..."

# Create install directory
mkdir -p "${INSTALL_DIR}"

# Download binary
TMPFILE=$(mktemp)
trap 'rm -f "${TMPFILE}"' EXIT

HTTP_CODE=$(curl -fsSL -w "%{http_code}" -o "${TMPFILE}" "${DOWNLOAD_URL}" 2>/dev/null || true)

if [ "${HTTP_CODE}" != "200" ] || [ ! -s "${TMPFILE}" ]; then
  echo "Error: Failed to download ${ARTIFACT} for version ${VERSION}"
  echo "URL: ${DOWNLOAD_URL}"
  echo ""
  echo "Available platforms: linux-amd64, linux-arm64, darwin-amd64, darwin-arm64"
  echo "Check https://github.com/${REPO}/releases for available versions."
  exit 1
fi

# Install binary
mv "${TMPFILE}" "${INSTALL_DIR}/${BINARY_NAME}"
chmod +x "${INSTALL_DIR}/${BINARY_NAME}"

echo "Installed ${BINARY_NAME} to ${INSTALL_DIR}/${BINARY_NAME}"

# Check if install dir is in PATH
if ! echo "${PATH}" | tr ':' '\n' | grep -qx "${INSTALL_DIR}"; then
  echo ""
  echo "NOTE: ${INSTALL_DIR} is not in your PATH."
  echo "Add the following to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
fi

echo ""
echo "You can also install as a gh extension:"
echo "  gh extension install ${REPO}"
