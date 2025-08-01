;; Water Rights Registry Contract
;; Language: Clarity (latest syntax)

(define-data-var admin principal tx-sender)

;; Map of water rights by principal (in liters/day)
(define-map water-rights principal uint)

;; Map of usage reports (liters used per period)
(define-map usage-reports principal uint)

;; List of suspended accounts
(define-map suspended-accounts principal bool)

;; Constants
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-ALREADY-REGISTERED u101)
(define-constant ERR-NOT-REGISTERED u102)
(define-constant ERR-INVALID-AMOUNT u103)
(define-constant ERR-SUSPENDED u104)
(define-constant ERR-OVERUSE u105)

;; Admin check
(define-private (is-admin (sender principal))
  (is-eq sender (var-get admin)))

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (var-set admin new-admin)
    (ok true)))

;; Register a new water rights holder
(define-public (register-rights-holder (holder principal) (allocation uint))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (> allocation u0) (err ERR-INVALID-AMOUNT))
    (asserts! (is-none (map-get? water-rights holder)) (err ERR-ALREADY-REGISTERED))
    (map-set water-rights holder allocation)
    (ok true)))

;; Revoke a holder
(define-public (revoke-holder (holder principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? water-rights holder)) (err ERR-NOT-REGISTERED))
    (map-delete water-rights holder)
    (map-delete usage-reports holder)
    (ok true)))

;; Suspend a holder temporarily
(define-public (suspend-holder (holder principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (map-set suspended-accounts holder true)
    (ok true)))

;; Reactivate a suspended account
(define-public (reactivate-holder (holder principal))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (map-delete suspended-accounts holder)
    (ok true)))

;; Submit a water usage report
(define-public (report-usage (amount uint))
  (begin
    (asserts! (is-none (map-get? suspended-accounts tx-sender)) (err ERR-SUSPENDED))
    (match (map-get? water-rights tx-sender)
      some-rights
        (begin
          (asserts! (<= amount some-rights) (err ERR-OVERUSE))
          (map-set usage-reports tx-sender amount)
          (ok true))
      none (err ERR-NOT-REGISTERED))))

;; Adjust water rights allocation
(define-public (adjust-allocation (holder principal) (new-allocation uint))
  (begin
    (asserts! (is-admin tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-some (map-get? water-rights holder)) (err ERR-NOT-REGISTERED))
    (asserts! (> new-allocation u0) (err ERR-INVALID-AMOUNT))
    (map-set water-rights holder new-allocation)
    (ok true)))

;; Read-only: get water allocation
(define-read-only (get-allocation (holder principal))
  (default-to u0 (map-get? water-rights holder)))

;; Read-only: get usage report
(define-read-only (get-usage (holder principal))
  (default-to u0 (map-get? usage-reports holder)))

;; Read-only: check if suspended
(define-read-only (is-suspended (holder principal))
  (is-some (map-get? suspended-accounts holder)))
