# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: orthodontists and dentists in Medellín who are not yet clients and are evaluating which dental lab to send their cases to. They arrive mostly from Google searches (for example "laboratorio de ortodoncia Medellín", "prótesis dental Medellín"). Secondary: existing client clinics checking the catalog, prices, or how to pay.

## Product Purpose
OrthoPro Lab is a dental lab in Medellín that makes orthodontic appliances and prosthetics from the physical impressions a practice sends. The public site exists to win new practices: rank for local searches, show what the lab makes, and get the first case sent.

## Positioning
Direct contact: the practice talks with the lab directly (WhatsApp) and follows each case through the client portal, instead of going through intermediaries.

## Operating Context
Case flow: receive physical impressions → plan the appliance or prosthesis → make it in the lab → return the finished work to the practice. Prices live in a downloadable PDF catalog. Payment is made to the official bank account, then confirmed. Client clinics have a separate portal (apps/clientes).

## Capabilities and Constraints
- Routes: `/`, `/catalogo`, `/catalogo/[servicio]`, `/nosotros`, `/pagos`.
- Copy is editable through `fetchContenido`/`texto` keys; keys and defaults must be preserved.
- SEO: local business in Medellín; JSON-LD and metadata already exist and must be kept or improved.
- Address: Cl. 53 #43 - 43, oficina 204, Medellín.

## Brand Commitments
Name "OrthoPro Lab". Spanish (Colombia), addressing the practitioner as "tú".

## Evidence on Hand
Real lab photos in `public/images/` (appliances, removable plates, expanders, aligners, complete and partial prosthetics, technicians at work). No testimonials, client counts, or delivery-time figures are confirmed; do not fabricate them.

## Product Principles
- Speak to the practitioner as a peer: technical, concrete, no hype.
- Show the real work; photos of real appliances beat claims.
- Make the first case easy to send and the human contact obvious.
- Every page is findable for a local search.
