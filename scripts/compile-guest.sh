#!/usr/bin/env bash
set -euo pipefail

SOURCE_FILE="${1:?usage: compile-guest.sh <guest-main.rs>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$ROOT/.cache/compiler-workspace"
CARGO_BIN="${CARGO_BIN:-$HOME/.cargo/bin/cargo}"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo '{"error":"guest source file was not found"}'
  exit 1
fi

if [[ ! -f "$WORKSPACE/Cargo.toml" ]]; then
  mkdir -p "$WORKSPACE"
  cp "$ROOT/zk/Cargo.toml" "$ROOT/zk/Cargo.lock" "$ROOT/zk/rust-toolchain.toml" "$WORKSPACE/"
  cp -R "$ROOT/zk/methods" "$ROOT/zk/host" "$WORKSPACE/"
fi

cp "$SOURCE_FILE" "$WORKSPACE/methods/guest/src/main.rs"
cd "$WORKSPACE"

IMAGE_ID="$($CARGO_BIN run --release --quiet --bin imageid | awk '/ImageID \(hex\)/ { print $NF }' | tail -n 1)"
if [[ -z "$IMAGE_ID" ]]; then
  echo '{"error":"ImageID was not emitted by the compiler"}'
  exit 1
fi

printf '{"imageId":"0x%s"}\n' "$IMAGE_ID"
