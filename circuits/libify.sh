#!/usr/bin/env bash

declare -a arr=("exponentiate" "ithk" "modulo" "random" "drawcardspublicly" "accessBit" "accessBitMao10" "accessBitMao20")

for i in "${arr[@]}"
do
   cp $i/circuit.circom $i/libcircuit.circom
   sed -i -e '$ d' $i/libcircuit.circom
done
