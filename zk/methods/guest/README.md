# zk/methods/guest — Guest Program

Otak pembuktian. Jalan di dalam zkVM. Logika **harus = `is_broken`** di `contracts/victim`.

## Pseudocode

```
baca privat: a, b
baca publik: target, victim_id

assert(a * b == target)
assert(a != 1 && b != 1)
assert(a != target && b != target)

// commit ke journal (PUBLIK) — TANPA a, b:
commit(victim_id)     // binding: proof ini untuk kontrak korban INI
commit(target)
commit("EXPLOIT_VALID")
```

- `a, b` **TIDAK** di-commit → tetap rahasia (inti dari ZK).
- `victim_id` di-commit → mengikat proof ke kontrak korban tertentu (anti-replay).

Detail: lihat [CLAUDE.md](../../../CLAUDE.md) §7.1.
