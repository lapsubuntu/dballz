

import { Vector } from './vector.js';

export function getSegmentIntersection(p0, p1, p2, p3) {
    let s1_x = p1.x - p0.x;
    let s1_y = p1.y - p0.y;
    let s2_x = p3.x - p2.x;
    let s2_y = p3.y - p2.y;

    let denom = (-s2_x * s1_y + s1_x * s2_y);
    if (denom === 0) return null; 

    let s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denom;
    let t = ( s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denom;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return new Vector(p0.x + (t * s1_x), p0.y + (t * s1_y));
    }
    return null;
}