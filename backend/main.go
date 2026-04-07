package main

import (
	"fmt"
	"net/http"
)

func main() {
	fmt.Println("Synaptik API starting on :8080...")

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello Luciano! Synaptik is live.")
	})

	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		fmt.Println("Error starting server:", err)
	}
}