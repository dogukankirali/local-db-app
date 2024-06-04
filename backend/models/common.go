package models

type Pagination struct {
	ItemCount      int `json:"itemCount"`
	CurrentPage    int `json:"currentPage"`
	TotalItemCount int `json:"totalItemCount"`
	ItemsPerPage   int `json:"itemsPerPage"`
	TotalPageCount int `json:"totalPageCount"`
}
type Filter struct {
	Key     string      `json:"key"`
	Value   interface{} `json:"value"`
	Operand string      `json:"operand,omitempty"`
}

type NumberFilter struct {
	Value   int    `json:"value"`
	Operand string `json:"operand,omitempty"`
}

type FilterArray struct {
	FilterArray []Filter `json:"filterArray"`
}
type ErrorResponse struct {
	Message string `json:"message"`
}
